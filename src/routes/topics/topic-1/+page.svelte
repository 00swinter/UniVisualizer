<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Time Complexity | UniVisualizer</title>
	<meta
		name="description"
		content="Notes for Algorithms: Big-O notation, growth rates, and complexity trade-offs."
	/>
</svelte:head>

<main class="topic-page">
	<a class="back" href={`${base}/`}>Back to topics</a>
	<h1>Time Complexity</h1>
	<p class="course">Algorithms</p>

	<section class="content">
		<p>
			This topic explains how algorithm runtime grows with input size and how to compare practical
			efficiency using Big-O notation.
		</p>
		<p>Expand this page with your own lecture notes, worked examples, and visual explanations.</p>
	</section>
</main>

<style>
	.topic-page {
		max-width: 760px;
		margin: 0 auto;
		padding: 3rem 1.2rem;
	}

	.back {
		display: inline-block;
		color: var(--color-text-muted);
		text-decoration: none;
		margin-bottom: 1.2rem;
	}

	.back:hover {
		color: var(--color-accent-4);
	}

	h1 {
		margin: 0;
		color: var(--color-text-heading-strong);
		font-size: clamp(1.8rem, 5vw, 2.8rem);
	}

	.course {
		margin: 0.5rem 0 0;
		color: var(--color-text-soft);
		font-weight: 600;
	}

	.content {
		margin-top: 1.3rem;
		padding: 1rem;
		border-radius: 0.9rem;
		border: 1px solid var(--color-border-1);
		background: var(--color-surface-4);
		color: var(--color-text-base);
		line-height: 1.7;
	}

	.content p {
		margin: 0;
	}

	.content p + p {
		margin-top: 0.85rem;
	}
</style>
