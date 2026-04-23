<script>
    /** @typedef {{ columns: string[], rows: Record<string, number>[] }} TruthTableData */
    /** @type {TruthTableData} */
    export let data;
</script>

{#if data && data.columns.length > 0}
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    {#each data.columns as column}
                        <th>{column}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each data.rows as row}
                    <tr>
                        {#each data.columns as column}
                            <td>
                                <span class:bit-zero={row[column] === 0} class:bit-one={row[column] === 1}>
                                    {row[column]}
                                </span>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

<style>
    .table-wrapper {
        max-width: 100%;
        overflow-x: auto;
        border: 1px solid var(--color-border-1);
        border-radius: 12px;
        background: linear-gradient(180deg, var(--color-surface-2), var(--color-surface-1));
        box-shadow: var(--shadow-card);
    }

    table {
        border-collapse: collapse;
        width: 100%;
        min-width: 100%;
        color: var(--color-text-base);
    }

    thead th {
        position: sticky;
        top: 0;
        background: var(--color-surface-2);
        color: var(--color-text-heading-strong);
        font-weight: 650;
        z-index: 1;
    }

    th,
    td {
        border: 1px solid var(--color-border-1);
        padding: 0.55rem 0.7rem;
        text-align: center;
        white-space: nowrap;
    }

    tbody tr:nth-child(even) {
        background: color-mix(in srgb, var(--color-surface-3) 80%, transparent);
    }

    tbody tr:hover {
        background: color-mix(in srgb, var(--color-accent-1) 20%, var(--color-surface-1));
    }

    span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.8rem;
        padding: 0.1rem 0.35rem;
        border-radius: 999px;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid transparent;
    }

    .bit-zero {
        background: rgba(255, 104, 104, 0.22);
        border-color: rgba(255, 132, 132, 0.42);
        color: #ffd6d6;
    }

    .bit-one {
        background: rgba(105, 219, 124, 0.24);
        border-color: rgba(140, 235, 156, 0.42);
        color: #dcffe1;
    }
</style>
