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
	campaignId: string;
	endTime: string;
	totalPool: number;
	ticketPrice: number;
}
