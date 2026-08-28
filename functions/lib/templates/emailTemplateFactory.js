"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWelcomeEmailTemplate = getWelcomeEmailTemplate;
const layout_1 = require("./layout");
const director_welcome_1 = require("./director-welcome");
const coach_welcome_1 = require("./coach-welcome");
const parent_welcome_1 = require("./parent-welcome");
function getWelcomeEmailTemplate(role, name) {
    let contentHtml = '';
    let subject = '';
    switch (role) {
        case 'director':
        case 'commissioner':
            contentHtml = director_welcome_1.directorWelcomeTemplate;
            subject = 'Welcome to SSTracker: Your Unified Operations Base is Ready 🚀';
            break;
        case 'coach':
            contentHtml = coach_welcome_1.coachWelcomeTemplate;
            subject = 'Sideline SIEM Active: Welcome to Coach OS ⏱️';
            break;
        case 'parent':
            contentHtml = parent_welcome_1.parentWelcomeTemplate;
            subject = 'Compliance Shield Active: Welcome to Parent OS 🛡️';
            break;
        default:
            return { subject: 'Welcome to SSTracker', html: '<p>Welcome!</p>' };
    }
    contentHtml = contentHtml.replace(/\{\{NAME\}\}/g, name || 'User');
    const finalHtml = layout_1.layoutTemplate.replace(/\{\{CONTENT\}\}/g, contentHtml);
    return { subject, html: finalHtml };
}
