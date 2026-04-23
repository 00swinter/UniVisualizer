<script>
    import TruthTable from "$lib/components/TruthTable.svelte";
    import LogicParser from "$lib/classes/logicParser";

    /** @typedef {{ type: string, value?: string, child?: ASTNode, childNodes?: ASTNode[] }} ASTNode */
    /** @typedef {{ atoms: string[], columns: string[], rows: Record<string, number>[] }} TruthTableData */

    const parser = new LogicParser();

    let inputValue = "";
    /** @type {ASTNode | null} */
    let ast = null;
    /** @type {TruthTableData | null} */
    let truthTable = null;
    let errorMessage = "";
    /** @type {string[]} */
    let displayTokens = [];

    /** @param {string} raw */
    function normalizeExpression(raw) {
        return raw
            .replace(/\bAND\b/gi, "&")
            .replace(/\*/g, "&")
            .replace(/\bOR\b/gi, "|")
            .replace(/\+/g, "|")
            .replace(/\bNOT\b/gi, "!")
            .replace(/~/g, "!")
            .replace(/\bTRUE\b/gi, "TRUE")
            .replace(/\bFALSE\b/gi, "FALSE")
            .replace(/([!&|()])/g, " $1 ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /** @param {Event & { currentTarget: HTMLInputElement }} event */
    function handleInput(event) {
        inputValue = normalizeExpression(event.currentTarget.value);
    }

    /** @param {string} token */
    function getTokenClass(token) {
        if (token === "TRUE") return "token-true";
        if (token === "FALSE") return "token-false";
        if (["!", "&", "|", "(", ")"].includes(token)) return "token-operator";
        return "token-variable";
    }

    $: {
        const expression = inputValue.trim();
        displayTokens = expression ? expression.split(" ") : [];

        if (!expression) {
            ast = null;
            truthTable = null;
            errorMessage = "";
        } else {
            try {
                ast = parser.parse_AST(expression);
                truthTable = /** @type {TruthTableData} */ (parser.buildTruthTable(ast));
                errorMessage = "";
            } catch (error) {
                ast = null;
                truthTable = null;
                errorMessage = error instanceof Error ? error.message : "Unknown parser error";
            }
        }
    }
</script>

<div class="page">
    <h1>Logic Parser</h1>
    <input
        type="text"
        value={inputValue}
        on:input={handleInput}
        placeholder="Type a logical expression (example: ! ( A & B ) | C)"
    />

    {#if displayTokens.length > 0}
        <div class="expression-preview">
            {#each displayTokens as token}
                <span class={`token ${getTokenClass(token)}`}>{token}</span>
            {/each}
        </div>
    {/if}

    {#if errorMessage}
        <p class="error">{errorMessage}</p>
    {/if}

    {#if ast}
        <h2>AST</h2>
        <pre>{JSON.stringify(ast, null, 2)}</pre>
    {/if}

    {#if truthTable}
        <h2>Truth Table (all subexpressions)</h2>
        <TruthTable data={truthTable} />
    {/if}
</div>


<style>
    .page {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    h1 {
        color: var(--color-text-heading-strong);
    }

    h2 {
        margin-top: 1rem;
    }

    input {
        width: min(100%, 34rem);
        padding: 0.5rem 0.75rem;
        font-size: 1.05rem;
        font-family: inherit;
        line-height: 1.45;
        border: 1px solid var(--color-border-1);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-surface-2) 60%, var(--color-surface-1));
        color: var(--color-text-base);
        outline: none;
    }

    input::placeholder {
        color: var(--color-text-placeholder);
    }

    pre {
        max-width: 100%;
        overflow-x: auto;
        padding: 0.75rem;
        border: 1px solid var(--color-border-soft);
        border-radius: 6px;
        background: var(--color-surface-muted);
    }

    .error {
        color: #d64545;
    }

    .expression-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        width: min(100%, 34rem);
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-1);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-surface-2) 70%, var(--color-surface-1));
    }

    .token {
        padding: 0.1rem 0.4rem;
        border: 1px solid transparent;
        border-radius: 999px;
        font-weight: 700;
    }

    .token-variable {
        color: #ffe28a;
        background: rgba(255, 205, 66, 0.16);
        border-color: rgba(255, 219, 120, 0.32);
    }

    .token-operator {
        color: var(--color-accent-4);
        background: rgba(var(--color-accent-rgb), 0.14);
        border-color: rgba(var(--color-accent-rgb), 0.32);
    }

    .token-true {
        color: #98f3a7;
        background: rgba(105, 219, 124, 0.24);
        border-color: rgba(140, 235, 156, 0.42);
    }

    .token-false {
        color: #ff9f9f;
        background: rgba(255, 104, 104, 0.22);
        border-color: rgba(255, 132, 132, 0.42);
    }
</style>