<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import {
		emptyMessageForTab,
		formatLastActive,
		initials,
		roleLabel,
		roleToneClass,
	} from '$lib/admin/globalUsersDisplay.js';
	import type { GlobalUserRow, GlobalUsersTab } from '$lib/types/adminUsers.js';

	interface Props {
		rows: GlobalUserRow[];
		loading: boolean;
		activeTab: GlobalUsersTab;
		searchApplied: string;
		clubNameMap: Map<string, string>;
		openMenuFor: string;
		loginAsBusyFor: string;
		pageIndex: number;
		hasNextPage: boolean;
		canDeactivateUser: (row: GlobalUserRow) => boolean;
		onToggleMenu: (userId: string) => void;
		onEditAdmin: (row: GlobalUserRow) => void;
		onLoginAs: (row: GlobalUserRow) => void;
		onDeactivate: (row: GlobalUserRow) => void;
		onPurge: (row: GlobalUserRow) => void;
		onPrevPage: () => void;
		onNextPage: () => void;
	}

	let {
		rows,
		loading,
		activeTab,
		searchApplied,
		clubNameMap,
		openMenuFor,
		loginAsBusyFor,
		pageIndex,
		hasNextPage,
		canDeactivateUser,
		onToggleMenu,
		onEditAdmin,
		onLoginAs,
		onDeactivate,
		onPurge,
		onPrevPage,
		onNextPage,
	}: Props = $props();
</script>

<div class="gu-table-wrap" role="region" aria-label="Global users table" tabindex="-1">
	<table class="gu-table">
		<thead>
			<tr>
				<th class="gu-th gu-th--avatar" aria-label="Avatar"></th>
				<th class="gu-th">Name / Email</th>
				<th class="gu-th">Global Role</th>
				<th class="gu-th">Associated Club</th>
				<th class="gu-th">Last Active</th>
				<th class="gu-th gu-th--right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#if loading && rows.length === 0}
				<tr>
					<td colspan="6" class="gu-td-empty">Loading users…</td>
				</tr>
			{:else if rows.length === 0}
				<tr>
					<td colspan="6" class="gu-td-empty">
						{#if searchApplied}
							No users in this segment match the search.
						{:else}
							{emptyMessageForTab(activeTab)}
						{/if}
					</td>
				</tr>
			{:else}
				{#each rows as row (row.id)}
					<tr class="gu-tr">
						<td class="gu-td gu-td--avatar">
							{#if row.photoURL}
								<img
									src={row.photoURL}
									alt=""
									class="gu-avatar gu-avatar--img"
									loading="lazy"
									referrerpolicy="no-referrer"
								/>
							{:else}
								<span class="gu-avatar" aria-hidden="true">
									{initials(row.displayName || row.playerName || row.email)}
								</span>
							{/if}
						</td>
						<td class="gu-td">
							<div class="gu-name">
								<span class="gu-name__primary">
									{row.displayName || row.playerName || row.email}
								</span>
								<span class="gu-name__email">{row.email}</span>
							</div>
						</td>
						<td class="gu-td">
							<div class="gu-role-cell">
								<span class="gu-role {roleToneClass(row.role)}">
									{roleLabel(row.role)}
								</span>
								{#if (row.status || '').toLowerCase() === 'suspended'}
									<span class="gu-suspended-pill" title="Access revoked">Suspended</span>
								{/if}
							</div>
						</td>
						<td class="gu-td">
							{#if row.clubId}
								<span class="gu-club">
									<Icon name={'org.building' as IconName} aria-hidden="true" />
									<span>{clubNameMap.get(row.clubId) || row.clubId}</span>
								</span>
							{:else}
								<span class="gu-muted">—</span>
							{/if}
						</td>
						<td class="gu-td">
							<span class="gu-muted" title={row.lastActiveSource || ''}>
								{formatLastActive(row.lastActiveAt)}
							</span>
						</td>
						<td class="gu-td gu-td--right">
							<div class="gu-actions" data-user-menu>
								<button
									type="button"
									class="gu-icon-btn"
									onclick={() => onToggleMenu(row.id)}
									aria-label="Actions for {row.email}"
									aria-haspopup="menu"
									aria-expanded={openMenuFor === row.id}
									disabled={loginAsBusyFor === row.id}
								>
									{#if loginAsBusyFor === row.id}
										<Icon name={'status.loading' as IconName} class="gu-menu__spin" aria-hidden="true" />
									{:else}
										<Icon name={'nav.more' as IconName} aria-hidden="true" />
									{/if}
								</button>

								{#if openMenuFor === row.id}
									<div class="gu-menu" role="menu" data-user-menu>
										<button
											type="button"
											class="gu-menu__item"
											role="menuitem"
											onclick={() => onEditAdmin(row)}
										>
											<Icon name={'action.edit' as IconName} aria-hidden="true" />
											<span>Edit {row.role === 'global_admin' || row.role === 'super_admin' ? 'Admin' : 'User'}</span>
										</button>

										<div class="gu-menu__sep" aria-hidden="true"></div>

										<button
											type="button"
											class="gu-menu__item"
											role="menuitem"
											disabled={row.role === 'super_admin' ||
												row.role === 'global_admin' ||
												loginAsBusyFor === row.id}
											onclick={() => onLoginAs(row)}
										>
											{#if loginAsBusyFor === row.id}
												<Icon name={'status.loading' as IconName} class="gu-menu__spin" aria-hidden="true" />
												<span>Launching session…</span>
											{:else}
												<Icon name={'nav.sign-in' as IconName} aria-hidden="true" />
												<span>Login As</span>
											{/if}
											{#if row.role === 'super_admin' || row.role === 'global_admin'}
												<span class="gu-menu__hint">global admin</span>
											{/if}
										</button>

										<div class="gu-menu__sep" aria-hidden="true"></div>

										<button
											type="button"
											class="gu-menu__item gu-menu__item--danger"
											role="menuitem"
											onclick={() => onDeactivate(row)}
											disabled={!canDeactivateUser(row)}
										>
											<Icon name={'sys.ban' as IconName} aria-hidden="true" />
											<span>Revoke access / Deactivate</span>
										</button>

										<div class="gu-menu__sep" aria-hidden="true"></div>

										<button
											type="button"
											class="gu-menu__item gu-menu__item--danger"
											role="menuitem"
											onclick={() => onPurge(row)}
											disabled={row.role === 'super_admin' || row.role === 'global_admin'}
										>
											<Icon name={'action.delete' as IconName} aria-hidden="true" />
											<span>Purge User Data (GDPR)</span>
										</button>
									</div>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<footer class="gu-foot">
	<div class="gu-foot__info">Page {pageIndex + 1}</div>
	<div class="gu-foot__ctrls">
		<button type="button" class="gu-btn gu-btn--ghost" onclick={onPrevPage} disabled={loading || pageIndex === 0}>
			<Icon name={'nav.chevron-left' as IconName} aria-hidden="true" />
			<span>Prev</span>
		</button>
		<button type="button" class="gu-btn gu-btn--ghost" onclick={onNextPage} disabled={loading || !hasNextPage}>
			<span>Next</span>
			<Icon name={'nav.chevron-right' as IconName} aria-hidden="true" />
		</button>
	</div>
</footer>
