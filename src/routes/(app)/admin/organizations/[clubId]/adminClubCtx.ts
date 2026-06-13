export type AdminClubDoc = Record<string, unknown> & { id: string };

export interface AdminClubCtx {
	clubDoc: AdminClubDoc | null;
	clubId: string;
	clubLoading: boolean;
	clubErr: string;
	setClubDoc: (d: AdminClubDoc) => void;
}

export const ADMIN_CLUB_CTX_KEY = 'adminClubCtx';
