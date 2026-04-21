<script lang="ts">
	import topics from '$lib/data/topics.json';

	let searchTerm = $state('');

	const filteredTopics = $derived.by(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term) {
			return topics;
		}

		return topics.filter((topic) => {
			const tags = Array.isArray(topic.tags) ? topic.tags.join(' ') : '';
			return `${topic.title} ${tags}`.toLowerCase().includes(term);
		});
	});
</script>

<svelte:head>
	<title>UniVisualizer | Topics</title>
	<meta
		name="description"
		content="Browse and search university math and computer science topics."
	/>
</svelte:head>

<main class="landing">
	<h1>UniVisualizer</h1>

	<label class="search-wrap" for="topic-search">
		<span class="sr-only">Search topics</span>
		<input
			id="topic-search"
			type="search"
			placeholder="Search topics or tags..."
			bind:value={searchTerm}
		/>
	</label>

	<section class="grid" aria-label="Topic cards">
		{#if filteredTopics.length === 0}
			<p class="empty">No topics match your search.</p>
		{:else}
			{#each filteredTopics as topic (topic.id)}
				<a class="card" href={topic.href}>
					<h2>{topic.title}</h2>
					<div class="tags">
						{#if topic.tags?.length}
							{#each topic.tags as tag}
								<span class="tag">#{tag}</span>
							{/each}
						{:else}
							<span class="tag muted">#untagged</span>
						{/if}
					</div>
				</a>
			{/each}
		{/if}
	</section>
</main>

<style>
	.landing {
		max-width: 900px;
		margin: 0 auto;
		padding: 4rem 1.2rem 3rem;
	}

	h1 {
		text-align: center;
		font-size: clamp(2.2rem, 6vw, 3.4rem);
		margin: 0 0 1.6rem;
		color: var(--color-text-heading);
		letter-spacing: 0.02em;
	}

	.search-wrap {
		display: block;
		max-width: 420px;
		margin: 0 auto 1.8rem;
		padding: 0.35rem;
		border-radius: 999px;
		background: linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2));
		box-shadow: var(--shadow-accent);
	}

	input {
		width: 100%;
		border: 1px solid var(--color-accent-3);
		border-radius: 999px;
		padding: 0.95rem 1.2rem;
		background: var(--color-surface-1);
		color: var(--color-text-strong);
		font-size: 1.04rem;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	input::placeholder {
		color: var(--color-text-placeholder);
	}

	input:focus {
		border-color: var(--color-accent-4);
		box-shadow: 0 0 0 4px rgba(var(--color-accent-rgb), 0.3);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.card {
		background: linear-gradient(155deg, var(--color-surface-2), var(--color-surface-3));
		min-height: 130px;
		border: 1px solid var(--color-border-1);
		border-radius: 1rem;
		padding: 1rem;
		text-decoration: none;
		color: inherit;
		box-shadow: var(--shadow-card);
		transition: transform 0.2s ease, border-color 0.2s ease;
	}

	.card:hover {
		transform: translateY(-3px);
		border-color: var(--color-accent-5);
	}

	.card h2 {
		font-size: 1.03rem;
		margin: 0;
		color: var(--color-text-strong);
		line-height: 1.35;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.85rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.55rem;
		border-radius: 999px;
		background: var(--color-tag-bg);
		border: 1px solid var(--color-tag-border);
		color: var(--color-text-tag);
		font-size: 0.78rem;
		line-height: 1;
	}

	.tag.muted {
		opacity: 0.8;
	}

	.empty {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--color-text-muted);
		background: var(--color-surface-4);
		border: 1px solid var(--color-border-2);
		border-radius: 0.9rem;
		padding: 1rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
