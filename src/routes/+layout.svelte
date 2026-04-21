<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/theme.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		min-height: 100vh;
		font-family:
			'Inter',
			'Segoe UI',
			Roboto,
			-apple-system,
			BlinkMacSystemFont,
			Arial,
			sans-serif;
		background: radial-gradient(
			circle at top,
			var(--color-bg-top) 0%,
			var(--color-bg-mid) 55%,
			var(--color-bg-bottom) 100%
		);
		color: var(--color-text-base);
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app-shell {
		min-height: 100vh;
	}
</style>
