<!--
	NexusSidebar — Pane 1 structural lock.
	
	This component enforces the tw-w-64 spatial boundary for the left rail.
	Navigation is rendered by EnterpriseConsoleShell (ec-sidebar) and
	PlayerShell (ps-rail) respectively — they are self-contained layout systems.
	This pane provides the flex-shrink-0 width anchor so the center canvas
	(tw-flex-1) can never bleed into or past the viewport edge.
-->
<nav
	class="tw-w-64 tw-flex-shrink-0 tw-h-full tw-border-r tw-border-slate-800 tw-z-50 tw-bg-[#0B0F19]"
	aria-label="Left navigation rail"
>
	<!-- Navigation is rendered by the shell component (EnterpriseConsoleShell / PlayerShell). -->
</nav>
