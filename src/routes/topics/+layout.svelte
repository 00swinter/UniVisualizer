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
		padding: 3rem 1rem;
		border: 1px solid red;
	}
	.back {
		display: inline-block;
		color: var(--color-text-muted);
		text-decoration: none;
		margin-bottom: 1.2rem;
	}

	.topics-content {
		width: min(100%, 70rem);
	}
</style>
