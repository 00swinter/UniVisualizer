<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title?: string;
		open?: boolean;
		children?: Snippet;
	}

	let {
		icon = 'help_outline',
		title = 'Information',
		open = $bindable(false),
		children
	}: Props = $props();

	function toggle() {
		open = !open;
	}
</script>

<div class="info_block" class:collapsed={!open}>
	<button type="button" class="info_header" onclick={toggle} aria-expanded={open}>
		<span class="material-icons-round">{icon}</span>
		<span class="heading_text">{title}</span>
		<span class="material-icons-round chevron">{open ? 'expand_less' : 'expand_more'}</span>
	</button>
	{#if open}
		<div class="info_body">
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.info_block {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid #343d4a;
		border-radius: 6px;
		padding: 10px;
		margin: 8px 0;
	}

	.info_block.collapsed {
		padding: 6px 10px;
	}

	.info_header {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 0;
		margin: 0;
		border: none;
		background: transparent;
		color: #3b82f6;
		cursor: pointer;
		text-align: left;
	}

	.info_block:not(.collapsed) .info_header {
		margin-bottom: 6px;
	}

	.info_header .material-icons-round {
		font-size: 16px;
	}

	.heading_text {
		flex: 1;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chevron {
		opacity: 0.7;
		margin-left: auto;
	}

	.info_body {
		font-size: 0.8rem;
		line-height: 1.5;
		color: #94a3b8;
	}
</style>
