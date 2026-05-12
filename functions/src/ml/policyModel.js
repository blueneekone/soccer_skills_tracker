'use strict';
/**
 * policyModel.js
 * ──────────────
 * Phase 3, Epic 4 (deliverable 2) — RL Adaptive Workout Engine (S4)
 *
 * Double DQN with prioritized experience replay.
 *
 * Architecture:
 *   Input:  state(50) + drillEmbedding(12) + volumeOnehot(5) + intensityOnehot(4) = 71 floats
 *   Hidden: [128, 128] ReLU
 *   Output: scalar Q value
 *
 * The class manages two networks:
 *   • onlineNet   — trained every step
 *   • targetNet   — soft-updated from onlineNet (τ = 0.005)
 *
 * Model artifacts are stored at:
 *   gs://{bucket}/rl_models/policy/v{version}/model.json
 *   gs://{bucket}/rl_models/policy/v{version}/weights.bin
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const admin = require('firebase-admin');

// TensorFlow.js is loaded lazily inside each method to avoid import overhead
// on function cold-starts where only non-ML paths are exercised.
let _tf = null;
function getTf() {
  if (!_tf) _tf = require('@tensorflow/tfjs-node');
  return _tf;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATE_DIM     = 50;
const DRILL_EMB_DIM = 12;
const VOLUME_DIM    = 5;  // buckets: -2,-1,0,1,2 as onehot
const INTENSITY_DIM = 4;  // recovery,low,medium,high as onehot
const INPUT_DIM     = STATE_DIM + DRILL_EMB_DIM + VOLUME_DIM + INTENSITY_DIM; // 71

const VOLUME_BUCKETS     = [-2, -1, 0, 1, 2];
const INTENSITY_BUCKETS  = ['recovery', 'low', 'medium', 'high'];

const SOFT_UPDATE_TAU    = 0.005;

/**
 * Get the GCS bucket name for this project.
 * @returns {string}
 */
function getBucketName() {
  const projectId = process.env.GCLOUD_PROJECT ||
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : null) ||
      'soccer-skills-tracker';
  return `${projectId}.appspot.com`;
}

// ── Onehot helpers ─────────────────────────────────────────────────────────────

/** @param {number} idx @param {number} size */
const onehot = (idx, size) => Array.from({ length: size }, (_, i) => (i === idx ? 1 : 0));

const volumeOnehot    = (v)  => onehot(VOLUME_BUCKETS.indexOf(v), VOLUME_DIM);
const intensityOnehot = (ib) => onehot(INTENSITY_BUCKETS.indexOf(ib), INTENSITY_DIM);

// ── Network builder ────────────────────────────────────────────────────────────

/**
 * Build the Q-network: [INPUT_DIM → 128 → 128 → 1]
 * @param {import('@tensorflow/tfjs-node')} tf
 */
function buildQNetwork(tf) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [INPUT_DIM], units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
  model.compile({ optimizer: tf.train.adam(1e-4), loss: 'huberLoss' });
  return model;
}

// ── PolicyModel class ──────────────────────────────────────────────────────────

class PolicyModel {
  constructor() {
    const tf = getTf();
    /** @type {import('@tensorflow/tfjs-node').Sequential} */
    this.onlineNet = buildQNetwork(tf);
    /** @type {import('@tensorflow/tfjs-node').Sequential} */
    this.targetNet = buildQNetwork(tf);
    // Copy weights online → target at init
    this._syncTargetNet();
  }

  /**
   * Hard-copy weights from onlineNet to targetNet.
   * Used at init; during training use softUpdateTargetNet instead.
   */
  _syncTargetNet() {
    const tf = getTf();
    tf.tidy(() => {
      const onlineWeights = this.onlineNet.getWeights();
      this.targetNet.setWeights(onlineWeights);
    });
  }

  /**
   * Soft-update: targetNet ← τ * onlineNet + (1-τ) * targetNet.
   * Called after each training batch.
   */
  softUpdateTargetNet() {
    const tf = getTf();
    tf.tidy(() => {
      const online = this.onlineNet.getWeights();
      const target = this.targetNet.getWeights();
      const updated = online.map((ow, i) =>
        tf.add(tf.mul(ow, SOFT_UPDATE_TAU), tf.mul(target[i], 1 - SOFT_UPDATE_TAU)),
      );
      this.targetNet.setWeights(updated);
    });
  }

  /**
   * Build the 71-float input vector for a single (state, drillEmbedding, action) tuple.
   *
   * @param {number[]}                         stateVec      50-float state
   * @param {number[]}                         drillEmb      12-float drill embedding
   * @param {import('../../types/rlPolicy').VolumeBucket}     volumeBucket
   * @param {import('../../types/rlPolicy').IntensityBucket}  intensityBucket
   * @returns {number[]} 71-float input vector
   */
  buildInputVector(stateVec, drillEmb, volumeBucket, intensityBucket) {
    return [
      ...stateVec,
      ...drillEmb,
      ...volumeOnehot(volumeBucket),
      ...intensityOnehot(intensityBucket),
    ];
  }

  /**
   * Predict Q-values for all candidate (drill × volume × intensity) tuples in a batch.
   *
   * @param {number[]}   stateVec    50-float state vector
   * @param {Array<{ drillId: string; embedding: number[] }>} candidates
   * @returns {{ drillId: string; volumeBucket: number; intensityBucket: string; qValue: number }[]}
   */
  predictQ(stateVec, candidates) {
    const tf = getTf();

    /** @type {number[][]} */
    const inputRows = [];
    /** @type {Array<{ drillId: string; volumeBucket: number; intensityBucket: string }>} */
    const meta = [];

    for (const cand of candidates) {
      for (const vb of VOLUME_BUCKETS) {
        for (const ib of INTENSITY_BUCKETS) {
          inputRows.push(this.buildInputVector(stateVec, cand.embedding, vb, ib));
          meta.push({ drillId: cand.drillId, volumeBucket: vb, intensityBucket: ib });
        }
      }
    }

    if (inputRows.length === 0) return [];

    const qValues = tf.tidy(() => {
      const inputTensor = tf.tensor2d(inputRows, [inputRows.length, INPUT_DIM]);
      const predTensor  = /** @type {import('@tensorflow/tfjs-node').Tensor} */ (
        this.onlineNet.predict(inputTensor)
      );
      return Array.from(predTensor.dataSync());
    });

    return meta.map((m, i) => ({
      drillId: m.drillId,
      volumeBucket: m.volumeBucket,
      intensityBucket: /** @type {import('../../types/rlPolicy').IntensityBucket} */ (m.intensityBucket),
      qValue: qValues[i],
    }));
  }

  /**
   * Compute Q(state, action) using the TARGET network (used in training).
   *
   * @param {number[][]} stateVecs
   * @param {number[][]} drillEmbs
   * @param {number[]}   volumeIdxs
   * @param {number[]}   intensityIdxs
   * @returns {number[]}
   */
  predictQTarget(stateVecs, drillEmbs, volumeIdxs, intensityIdxs) {
    const tf = getTf();
    const inputRows = stateVecs.map((sv, i) => [
      ...sv,
      ...drillEmbs[i],
      ...onehot(volumeIdxs[i], VOLUME_DIM),
      ...onehot(intensityIdxs[i], INTENSITY_DIM),
    ]);
    return tf.tidy(() => {
      const t = tf.tensor2d(inputRows, [inputRows.length, INPUT_DIM]);
      const pred = /** @type {import('@tensorflow/tfjs-node').Tensor} */ (
        this.targetNet.predict(t)
      );
      return Array.from(pred.dataSync());
    });
  }

  /**
   * Single gradient update step.
   *
   * @param {number[][]} stateVecs
   * @param {number[][]} drillEmbs
   * @param {number[]}   volumeIdxs
   * @param {number[]}   intensityIdxs
   * @param {number[]}   targets  TD-target Q values
   * @returns {Promise<number>} mean Huber loss
   */
  async trainStep(stateVecs, drillEmbs, volumeIdxs, intensityIdxs, targets) {
    const tf = getTf();
    const inputRows = stateVecs.map((sv, i) => [
      ...sv,
      ...drillEmbs[i],
      ...onehot(volumeIdxs[i], VOLUME_DIM),
      ...onehot(intensityIdxs[i], INTENSITY_DIM),
    ]);

    const xTensor = tf.tensor2d(inputRows, [inputRows.length, INPUT_DIM]);
    const yTensor = tf.tensor2d(targets.map((t) => [t]), [targets.length, 1]);

    const history = await this.onlineNet.fit(xTensor, yTensor, {
      batchSize: inputRows.length,
      epochs: 1,
      verbose: 0,
    });

    tf.dispose([xTensor, yTensor]);

    const loss = Array.isArray(history.history.loss) ?
      Number(history.history.loss[0]) :
      NaN;

    this.softUpdateTargetNet();
    return loss;
  }

  // ── GCS persistence ──────────────────────────────────────────────────────────

  /**
   * Save model to GCS at gs://{bucket}/rl_models/policy/v{version}/.
   *
   * TF.js file I/O: saves model.json + group1-shard1of1.bin
   * We rename the weights file to weights.bin for convention.
   *
   * @param {number} version
   * @returns {Promise<string>} GCS path
   */
  async saveToGcs(version) {
    const tf = getTf();
    const tmpDir = path.join(os.tmpdir(), `rl_model_v${version}`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Save locally first
    await this.onlineNet.save(`file://${tmpDir}`);

    const bucket = admin.storage().bucket(getBucketName());
    const gcsPrefix = `rl_models/policy/v${version}`;

    // Upload model.json
    await bucket.upload(path.join(tmpDir, 'model.json'), {
      destination: `${gcsPrefix}/model.json`,
      metadata: { contentType: 'application/json' },
    });

    // Upload weights (TF.js may produce weights.bin or group1-shard1of1.bin)
    const weightsSrc = fs.existsSync(path.join(tmpDir, 'weights.bin')) ?
      path.join(tmpDir, 'weights.bin') :
      path.join(tmpDir, 'group1-shard1of1.bin');

    await bucket.upload(weightsSrc, {
      destination: `${gcsPrefix}/weights.bin`,
      metadata: { contentType: 'application/octet-stream' },
    });

    // Clean up tmp
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return `gs://${getBucketName()}/${gcsPrefix}/`;
  }

  /**
   * Load model from GCS.
   *
   * @param {number} version
   * @returns {Promise<PolicyModel>}
   */
  static async loadFromGcs(version) {
    const tf = getTf();
    const bucket = admin.storage().bucket(getBucketName());
    const gcsPrefix = `rl_models/policy/v${version}`;
    const tmpDir = path.join(os.tmpdir(), `rl_model_v${version}_load`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Download model.json
    await bucket.file(`${gcsPrefix}/model.json`).download({ destination: path.join(tmpDir, 'model.json') });
    // Patch model.json to point to local weights path
    const modelJson = JSON.parse(fs.readFileSync(path.join(tmpDir, 'model.json'), 'utf-8'));
    const weightsManifest = modelJson.weightsManifest ?? [];
    if (weightsManifest.length > 0) {
      weightsManifest[0].paths = ['weights.bin'];
    }
    fs.writeFileSync(path.join(tmpDir, 'model.json'), JSON.stringify(modelJson));

    // Download weights.bin
    await bucket.file(`${gcsPrefix}/weights.bin`).download({ destination: path.join(tmpDir, 'weights.bin') });

    // Load the online net from disk
    const loadedNet = /** @type {import('@tensorflow/tfjs-node').Sequential} */ (
      await tf.loadLayersModel(`file://${tmpDir}/model.json`)
    );
    loadedNet.compile({ optimizer: tf.train.adam(1e-4), loss: 'huberLoss' });

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // Assemble a PolicyModel with the loaded weights
    const pm = new PolicyModel();
    pm.onlineNet = loadedNet;
    pm._syncTargetNet();
    return pm;
  }

  /**
   * Read the current deployed version from `rl_policy_state/current`.
   * @returns {Promise<number>}
   */
  static async latestVersion() {
    const snap = await admin.firestore().collection('rl_policy_state').doc('current').get();
    return snap.exists ? (Number(snap.data().policyVersion) || 0) : 0;
  }

  /**
   * Create a PolicyModel with random (untrained) weights — used for v1 cold-boot.
   * @returns {PolicyModel}
   */
  static randomPolicy() {
    return new PolicyModel();
  }
}

// ── Module-level model cache (warm-loaded for inference function) ──────────────

let _cachedModel = null;
let _cachedVersion = -1;

/**
 * Return a warm PolicyModel, refreshing when the version changes.
 * Called by the inference callable (S5).
 *
 * @param {number} version
 * @returns {Promise<PolicyModel>}
 */
async function getWarmModel(version) {
  if (_cachedModel && _cachedVersion === version) return _cachedModel;
  _cachedModel = await PolicyModel.loadFromGcs(version);
  _cachedVersion = version;
  return _cachedModel;
}

module.exports = {
  PolicyModel,
  getWarmModel,
  VOLUME_BUCKETS,
  INTENSITY_BUCKETS,
  INPUT_DIM,
  STATE_DIM,
};
