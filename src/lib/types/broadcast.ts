// SuperdrawCampaign model definition for Epic 6
export interface BroadcastSession {
	sessionId: string;
	tenantId: string;
	streamUrl: string;
	isActive: boolean;
	mvpVoting: {
		votingActive: boolean;
		candidates: string[];
		results: Record<string, number>;
	};
}

export interface BroadcastInteraction {
	userId: string;
	interactionType: 'vote' | 'confetti_burst' | 'superdraw_ticket';
	payload: Record<string, any>;
	timestamp: string;
}

export interface SuperdrawCampaign {
	/** Unique identifier for the superdraw campaign */
	campaignId: string;
	/** ISO 8601 timestamp representing when the superdraw campaign ends */
	endTime: string;
	/** The total accumulated prize pool in USD */
	totalPool: number;
	/** Price per superdraw ticket in USD */
	ticketPrice: number;
}

export interface SmartCameraNode {
	cameraId: string;
	venueId: string;
	currentStreamUrl: string;
	status: 'ONLINE' | 'OFFLINE';
	streamResolution: string;
}
