<script lang="ts">
    import {
        ASTParser,
        TruthTableGenerator,
        type ASTNode,
        type TruthTable as TruthTableData,
    } from "$lib/classes/logicParser";

    let inputValue = $state("");
    let inputRef: HTMLInputElement;
    let variableFilters = $state<Record<string, "true" | "false" | "any">>({});
    let filtersEnabled = $state(false);

    let expression = $derived(inputValue.trim());
    let displayTokens = $derived(expression ? expression.split(" ") : []);

    let parseResult = $derived.by(() => {
        if (!expression) {
            return { ast: null, truthTable: null, errorMessage: "" };
        }

        try {
            const parser = new ASTParser(expression);
            const ast = parser.parse();

            const generator = new TruthTableGenerator();
            const truthTable = generator.build(ast);

            return { ast, truthTable, errorMessage: "" };
        } catch (error) {
            return {
                ast: null,
                truthTable: null,
                errorMessage:
                    error instanceof Error
                        ? error.message
                        : "Unknown parser error",
            };
        }
    });

    let ast = $derived(parseResult.ast);
    let truthTable = $derived(parseResult.truthTable);
    let errorMessage = $derived(parseResult.errorMessage);

    $effect(() => {
        const atoms = truthTable?.atoms ?? [];
        const currentKeys = Object.keys(variableFilters);
        const hasSameKeys =
            currentKeys.length === atoms.length &&
            currentKeys.every((key) => atoms.includes(key));

        if (hasSameKeys) return;

        const nextFilters: Record<string, "true" | "false" | "any"> = {};
        for (const atom of atoms) {
            nextFilters[atom] = variableFilters[atom] ?? "any";
        }
        variableFilters = nextFilters;
    });

    function getTokenClass(token: string): string {
        if (token === "TRUE") return "tokenTrue";
        if (token === "FALSE") return "tokenFalse";
        if (["!", "&", "|", "(", ")"].includes(token)) return "tokenOperator";
        return "tokenVariable";
    }

    function appendOperator(operator: string) {
        if (!inputRef) return;

        const start = inputRef.selectionStart ?? inputValue.length;
        const end = inputRef.selectionEnd ?? inputValue.length;
        const insertText = operator;

        inputValue =
            inputValue.slice(0, start) + insertText + inputValue.slice(end);

        const newPos = start + insertText.length;

        /*
        setTimeout(() => {
            inputRef.focus();
            inputRef.setSelectionRange(newPos, newPos);
        }, 0);
        */
       normaliseInput();
    }

    function getFilter(atom: string): "true" | "false" | "any" {
        return variableFilters[atom] || "any";
    }

    function setFilter(atom: string, val: "true" | "false" | "any") {
        variableFilters = { ...variableFilters, [atom]: val };
    }

    function isRowMatch(row: Record<string, number>): boolean {
        for (const atom of Object.keys(variableFilters)) {
            if (!(atom in row)) continue;
            const filterValue = variableFilters[atom];
            if (filterValue === "any") continue;

            const expected = filterValue === "true" ? 1 : 0;
            if (row[atom] !== expected) {
                return false;
            }
        }
        return true;
    }

    function toggleFilters() {
        filtersEnabled = !filtersEnabled;
    }

    function normaliseInput() {
        const oldStart = inputRef.selectionStart ?? 0;
        const oldEnd = inputRef.selectionEnd ?? 0;

        //get
        let expression = inputValue;
        const beforeLength = expression.length;
        //format
        expression = expression.replace(/ (?= )/g, ""); // _ _  -> _

        //rules for () missing and need to be before ! fix

        expression = expression.replace(/(?<= )(imply|IMPLY)(?= )/g, "⇒"); //  _imply_ -> _⇒_
        expression = expression.replace(/(?<= )(=>)(?= )/g, "⇒"); //              _=>_ -> _⇒_


        expression = expression.replace(/(?<= )(or|OR)(?= )/g, "|"); //           _or_ -> _|_
        expression = expression.replace(/(?<= )(\+)(?= )/g, "|"); //               _+_ -> _|_
        
        
        expression = expression.replace(/(?<= )(and|AND)(?= )/g, "&"); //        _and_ -> _&_
        expression = expression.replace(/(?<= )(\*)(?= )/g, "&"); //               _*_ -> _&_


        expression = expression.replace(/(?<=( |^))(not|NOT)(?= )/g, "!"); //    _not_ -> _!_
        expression = expression.replace(/(?<=( |^))(~)(?= )/g, "!"); //            _~_ -> _!_


        expression = expression.replace(/(?<! )&(?!( |$))/g, " & "); //            a&a -> _&_
        expression = expression.replace(/(?<! )&(?= )/g, " &"); //                  &_ -> _&
        expression = expression.replace(/(?<= )&(?!( |$))/g, "& "); //              _& -> &_

        expression = expression.replace(/(?<! )\|(?!( |$))/g, " | "); //            |  -> _|_
        expression = expression.replace(/(?<! )\|(?= )/g, " |"); //                 |_ -> _|
        expression = expression.replace(/(?<= )\|(?!( |$|\)))/g, "| "); //          _| -> |_

        //expression = expression.replace(/(?<= )\|(?!( |$))/g, "| ");    //        _| -> |_

        expression = expression.replace(/! /gm, "!"); // !_  -> !

        /*
        expression = expression.replace(/\b\w+\b/g, (word) => {
            const first = word.charAt(0);
            // test if first character is uppercase A–Z
            if (first >= "A" && first <= "Z") {
                return word.toUpperCase();
            } else {
                return word.toLowerCase();
            }
        });
        */

        //expression = expression.replace(/(?<=([A-Za-z_] ))[A-Za-z_]+/g, "") // to get rig if listing variables like "area bert test" this will match "bert and test"
        //set

        const afterLength = expression.length;
        const delta = afterLength - beforeLength;

        inputValue = expression;

        const newPos = oldStart + delta;
        inputRef.setSelectionRange(newPos, newPos);

        //            cony & area & (tomy | bla)
    }
</script>

<div class="page">
    
    <h1>Logic Parser</h1>

    <div class="buttonContainer">
        <button class="operatorBtn" onclick={() => appendOperator("&")}
            >&</button
        >
        <button class="operatorBtn" onclick={() => appendOperator("|")}
            >|</button
        >
        <button class="operatorBtn" onclick={() => appendOperator("!")}
            >!</button
        >
        <button class="operatorBtn" onclick={() => appendOperator("(")}
            >(</button
        >
        <button class="operatorBtn" onclick={() => appendOperator(")")}
            >)</button
        >
        <button class="operatorBtn" onclick={() => appendOperator("⇒")}
            >⇒</button
        >
    </div>

    <input
        bind:this={inputRef}
        type="text"
        bind:value={inputValue}
        oninput={normaliseInput}
        placeholder="Type a logical expression"
    />

    {#if displayTokens.length > 110}
        <div class="expressionPreview">
            {#each displayTokens as token}
                <span class={`token ${getTokenClass(token)}`}>{token}</span>
            {/each}
        </div>
    {/if}

    {#if errorMessage}
        <p class="error">{errorMessage}</p>
    {/if}

    {#if truthTable && truthTable.atoms.length > 0}
        <div class="variableConfig">
            <div class="filterHeader">
                <h3>Variable States</h3>
                <button
                    class="masterToggle {filtersEnabled ? 'activeToggle' : ''}"
                    onclick={toggleFilters}
                >
                    {filtersEnabled ? "Filters On" : "Filters Off"}
                </button>
            </div>

            {#if filtersEnabled}
                <div class="variableGrid">
                    {#each truthTable.atoms as atom}
                        <div class="variableControl">
                            <span class="variableName">{atom}</span>
                            <div class="toggleGroup">
                                <button
                                    class="toggleBtn {getFilter(atom) === 'true'
                                        ? 'activeTrue'
                                        : ''}"
                                    onclick={() => setFilter(atom, "true")}
                                    >T</button
                                >
                                <button
                                    class="toggleBtn {getFilter(atom) === 'any'
                                        ? 'activeAny'
                                        : ''}"
                                    onclick={() => setFilter(atom, "any")}
                                    >Any</button
                                >
                                <button
                                    class="toggleBtn {getFilter(atom) ===
                                    'false'
                                        ? 'activeFalse'
                                        : ''}"
                                    onclick={() => setFilter(atom, "false")}
                                    >F</button
                                >
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <h2>Truth Table</h2>
        <div class="tableContainer">
            <table>
                <thead>
                    <tr>
                        {#each truthTable.columns as col}
                            <th>{col}</th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each truthTable.rows as row}
                        {#if !filtersEnabled || isRowMatch(row)}
                            <tr>
                                {#each truthTable.columns as col}
                                    <td
                                        class={row[col] === 1
                                            ? "valTrue"
                                            : "valFalse"}>{row[col]}</td
                                    >
                                {/each}
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    {#if ast}
        <h2>AST</h2>
        <pre>{JSON.stringify(ast, null, 2)}</pre>
    {/if}
</div>

<style>
    .page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
		border: 1px solid red;
        flex: 1;

    }

    h1,
    h2,
    h3 {
        color: var(--color-text-heading-strong);
        margin: 0;
    }

    h2 {
        margin-top: 1rem;
    }

    h3 {
        font-size: 1.1rem;
    }

    .buttonContainer {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .operatorBtn {
        background: color-mix(
            in srgb,
            var(--color-surface-2) 80%,
            var(--color-surface-1)
        );
        color: var(--color-text-heading-strong);
        border: 1px solid var(--color-border-1);
        border-radius: 6px;
        padding: 0.4rem 0.8rem;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition:
            background 0.2s ease,
            border-color 0.2s ease;
    }

    .operatorBtn:hover {
        background: color-mix(
            in srgb,
            var(--color-surface-2) 40%,
            var(--color-surface-1)
        );
        border-color: var(--color-border-soft);
    }

    input {
        width: min(100%, 34rem);
        padding: 0.5rem 0.75rem;
        font-size: 1.05rem;
        font-family: inherit;
        line-height: 1.45;
        border: 1px solid var(--color-border-1);
        border-radius: 8px;
        background: color-mix(
            in srgb,
            var(--color-surface-2) 60%,
            var(--color-surface-1)
        );
        color: var(--color-text-base);
        outline: none;
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

    .expressionPreview {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        width: min(100%, 34rem);
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-1);
        border-radius: 8px;
        background: color-mix(
            in srgb,
            var(--color-surface-2) 70%,
            var(--color-surface-1)
        );
    }

    .token {
        padding: 0.1rem 0.4rem;
        border: 1px solid transparent;
        border-radius: 999px;
        font-weight: 700;
    }

    .tokenVariable {
        color: #ffe28a;
        background: rgba(255, 205, 66, 0.16);
        border-color: rgba(255, 219, 120, 0.32);
    }

    .tokenOperator {
        color: var(--color-accent-4);
        background: rgba(var(--color-accent-rgb), 0.14);
        border-color: rgba(var(--color-accent-rgb), 0.32);
    }

    .tokenTrue {
        color: #98f3a7;
        background: rgba(105, 219, 124, 0.24);
        border-color: rgba(140, 235, 156, 0.42);
    }

    .tokenFalse {
        color: #ff9f9f;
        background: rgba(255, 104, 104, 0.22);
        border-color: rgba(255, 132, 132, 0.42);
    }

    .variableConfig {
        padding: 1rem;
        border: 1px solid var(--color-border-1);
        border-radius: 8px;
        background: color-mix(in srgb, var(--color-surface-2) 30%, transparent);
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .filterHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .masterToggle {
        padding: 0.4rem 0.8rem;
        border: 1px solid var(--color-border-soft);
        border-radius: 6px;
        background: var(--color-surface-2);
        color: var(--color-text-base);
        cursor: pointer;
        font-weight: bold;
        transition:
            background 0.2s,
            color 0.2s;
    }

    .activeToggle {
        background: #4caf50;
        color: white;
        border-color: #4caf50;
    }

    .variableGrid {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .variableControl {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--color-surface-1);
        padding: 0.4rem;
        border-radius: 6px;
        border: 1px solid var(--color-border-soft);
    }

    .variableName {
        font-weight: bold;
        min-width: 2rem;
        text-align: center;
    }

    .toggleGroup {
        display: flex;
        background: var(--color-surface-2);
        border-radius: 4px;
        overflow: hidden;
    }

    .toggleBtn {
        padding: 0.3rem 0.6rem;
        border: none;
        background: transparent;
        color: var(--color-text-base);
        cursor: pointer;
        font-size: 0.9rem;
        transition:
            background 0.2s,
            color 0.2s;
    }

    .activeTrue {
        background: #4caf50;
        color: white;
        font-weight: bold;
    }

    .activeAny {
        background: #888;
        color: white;
        font-weight: bold;
    }

    .activeFalse {
        background: #f44336;
        color: white;
        font-weight: bold;
    }

    .tableContainer {
        overflow-x: auto;
        border: 1px solid var(--color-border-soft);
        border-radius: 6px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: center;
        font-family: monospace;
    }

    th,
    td {
        padding: 0.6rem;
        border: 1px solid var(--color-border-soft);
    }

    th {
        background: color-mix(
            in srgb,
            var(--color-surface-2) 60%,
            var(--color-surface-1)
        );
        font-weight: bold;
    }

    tr:nth-child(even) {
        background: rgba(255, 255, 255, 0.02);
    }

    .valTrue {
        background: rgba(76, 175, 80, 0.3);
    }

    .valFalse {
        background: rgba(244, 67, 54, 0.3);
    }
</style>
