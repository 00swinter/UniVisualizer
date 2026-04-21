<script>
    let inputValue = "";
</script>

<div>
    <h1>Logic Parser</h1>
    <input
        type="text"
        bind:value={inputValue}
        placeholder="Type a logical expression..."
    />

</div>


<style>
    h1 {
        color: var(--color-text-heading-strong);
    }

    input {
        margin-top: 1rem;
        padding: 0.5rem 0.75rem;
        width: min(100%, 28rem);
    }
</style>