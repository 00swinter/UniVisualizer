<script>
	import { base } from '$app/paths';

	let { children } = $props();
</script>

<a class="back" href={`${base}/`}>Back to topics</a>
<section class="topics-layout">
	<div class="topics-content">
		{@render children()}
	</div>
</section>

<style>
	.topics-layout {
		min-height: 100vh;
		display: flex;
		justify-content: center;
		padding: 1.5rem 1rem 3rem;
	}
	.back {
		display: inline-block;
		color: var(--color-text-muted);
		text-decoration: none;
		margin: 1rem 1rem 0;
	}

	.topics-content {
		width: 100%;
		max-width: none;
	}
</style>
