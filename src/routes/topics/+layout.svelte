<script>
	let { children } = $props();
</script>

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
	}

	.topics-content {
		width: min(100%, 48rem);
	}
</style>
