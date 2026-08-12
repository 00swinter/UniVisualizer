<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	interface Props {
		title?: string;
		icon?: string;
		enabled?: boolean;
		collapsed?: boolean;
		onReset?: () => void;
		children?: Snippet;
	}

	let {
		title = 'Template Operator',
		icon = 'build',
		enabled = $bindable(true),
		collapsed = $bindable(true),
		onReset,
		children
	}: Props = $props();

	function handleReset() {
		if (onReset) onReset();
	}

	function toggleCollapsed() {
		collapsed = !collapsed;
	}
</script>

<div class="operator_container" class:bypassed={!enabled} class:collapsed>
	<div class="header_div">
		<div class="title_container">
			<button
				class="icon_button power_btn"
				aria-pressed={enabled}
				onclick={() => (enabled = !enabled)}
				title={enabled ? 'Bypass Operator' : 'Enable Operator'}
			>
				<span class="material-icons-round">power_settings_new</span>
			</button>

			<button
				type="button"
				class="title_toggle"
				onclick={toggleCollapsed}
				aria-expanded={!collapsed}
				title={collapsed ? 'Expand operator' : 'Collapse operator'}
			>
				<span class="material-icons-round operator_icon">{icon}</span>
				<span class="title_text">{title}</span>
				<span class="material-icons-round chevron">
					{collapsed ? 'expand_more' : 'expand_less'}
				</span>
			</button>
		</div>

		{#if !collapsed}
			<button
				class="icon_button reset_btn"
				onclick={handleReset}
				title="Reset Settings"
				transition:fade={{ duration: 140 }}
			>
				<span class="material-icons-round">replay</span>
			</button>
		{/if}
	</div>

	{#if !collapsed}
		<div class="content_shell" transition:slide={{ duration: 180 }}>
			<hr class="divider" />

			<div class="content">
				{@render children?.()}
			</div>
		</div>
	{/if}
</div>

<style>
	.operator_container {
		--bg-card: #1e252e;
		--bg-button: #161b22;
		--brdr-card: #343d4a;
		--accent-blue: #3b82f6;
		--text-bright: #f1f5f9;
		--text-muted: #94a3b8;

		background: var(--bg-card);
		border: 1px solid var(--brdr-card);
		border-radius: 10px;
		padding: 12px;
		color: var(--text-bright);
		font-family: 'Inter', system-ui, sans-serif;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100%;
		max-width: var(--operator-max-width, 320px);
		min-width: 0;
		box-sizing: border-box;
	}

	.operator_container.collapsed {
		width: auto;
		max-width: 100%;
		min-width: 160px;
		padding: 6px 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.bypassed {
		border-color: #242b35;
		opacity: 0.7;
	}

	.bypassed .content {
		filter: grayscale(1);
		opacity: 0.4;
		pointer-events: none;
	}

	.header_div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2px;
		gap: 8px;
	}

	.operator_container.collapsed .header_div {
		margin-bottom: 0;
	}

	.title_container {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		flex: 1;
	}

	.title_toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		flex: 1;
		padding: 2px 4px;
		margin: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}

	.title_toggle:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.title_text {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--text-bright);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.operator_icon {
		color: var(--accent-blue);
		font-size: 18px;
		opacity: 0.9;
		flex-shrink: 0;
	}

	.chevron {
		color: var(--text-muted);
		font-size: 18px;
		flex-shrink: 0;
		margin-left: auto;
	}

	.icon_button {
		all: unset;
		background: var(--bg-button);
		border: 1px solid var(--brdr-card);
		color: var(--text-muted);
		border-radius: 6px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.icon_button:hover {
		border-color: #4b5563;
	}

	.power_btn[aria-pressed='false'] {
		color: rgb(178, 30, 30);
		text-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
	}

	.power_btn[aria-pressed='true'] {
		color: rgb(22, 148, 22);
		text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
	}

	.reset_btn:active {
		transform: scale(0.9) rotate(-30deg);
		color: #ef4444;
	}

	.divider {
		border: 0;
		height: 1px;
		background: linear-gradient(90deg, var(--brdr-card) 0%, transparent 100%);
		margin: 12px 0;
	}

	.content {
		padding: 4px 0;
		min-width: 0;
	}

	.material-icons-round {
		font-size: 18px;
		user-select: none;
	}
</style>
