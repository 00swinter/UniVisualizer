export default class LogicParser {
    constructor() {
    }

    parse_AST(expression) {
        this.tokens = tokenize(expression);
        this.pos = 0;
        let ast = this.parse_OR();

        if (this.peekToken().type !== "EOF") {
            throw new Error(`unexpected token "${this.peekToken().value}"`);
        }

        return ast;
    }
    parse_OR() {
        let childNodes = [this.parse_AND()];

        while (this.peekValue() == "|") {
            this.next("|");
            childNodes.push(this.parse_AND());
        }

        if (childNodes.length > 1) {
            return { type: "OR", childNodes: childNodes };
        } else {
            return childNodes[0];
        }

    }
    parse_AND() {
        let childNodes = [this.parse_NEGATION()];

        while (this.peekValue() == "&") {
            this.next("&");
            childNodes.push(this.parse_NEGATION());
        }

        if (childNodes.length > 1) {
            return { type: "AND", childNodes: childNodes };
        } else {
            return childNodes[0];
        }
    }
    parse_NEGATION() {
        if (this.peekValue() == "!") {
            this.next("!");
            return { type: "NOT", child: this.parse_NEGATION() };
        }
        return this.parse_ATOM();
    }
    parse_ATOM() {//expression | literal | variable (expression can be boild down to literall so its on the same level)
        let token = this.peekToken();
        if (token.type == "TRUE") {
            this.next("TRUE");
            return { type: "CONST", value: true };
        }

        if (token.type == "FALSE") {
            this.next("FALSE");
            return { type: "CONST", value: false };
        }

        if (token.type == "VAR") {
            this.next("VAR");

            if (this.peekToken().type == "VAR") {

                throw new Error("two var in a row is not valid syntax");
            }

            return { type: "VAR", value: token.value }
        }

        this.next("(");
        let node = this.parse_OR();
        this.next(")");

        return node;
    }


    peekValue() {
        const tk = this.tokens[this.pos];
        return tk ? tk.value : null;
    }
    peekToken() {
        return this.tokens[this.pos];
    }
    next(type) {
        const token = this.peekToken();

        if (type && type != token.type) {
            throw new Error(`expected "${type}" instead of "${token.type}"`);
        }
        this.pos++;
        return token;
    }


    evaluate_AST(ast, groups) {
        this.groups = groups;
        this.universe = [...new Set(Object.values(groups).flat())];   //flattened groups array;
        console.log("universe: ", this.universe);

        return this.evaluate_NODE(ast);
    }

    evaluate_NODE(node) {
        switch (node.type) {
            case "CONST":
                return node.value ? [...(this.universe ?? [])] : [];
            case "VAR":
                if (detectCase(node.value) == "upper") {
                    //return all groups that match but as the markers whithin so not LEFT but ["markerA", "MarkerB"] in LEFT
                    let matchingGroupsArray = Object
                        .entries(this.groups)                                    // [ [key, val], … ]
                        .filter(([groupName]) =>
                            groupName.toLowerCase().includes(node.value.toLowerCase())
                        );

                    let matchingGroupsObj = Object.fromEntries(matchingGroupsArray);

                    return Object.values(matchingGroupsObj).flat();

                } else {
                    //return all markers that match
                    return this.universe.filter(markerName =>
                        markerName.split("_$_")[1].toLowerCase().includes(node.value.toLowerCase())
                    );
                }
            case "OR":
                // union of all children
                let childListsAnd = node.childNodes.map(n => this.evaluate_NODE(n));
                return unionAll(childListsAnd);
            case "AND":
                //intersection of all children
                let childListsOr = node.childNodes.map(n => this.evaluate_NODE(n));
                return intersectionAll(childListsOr);
            case "NOT":
                //complement of children
                let childListNot = this.evaluate_NODE(node.child);
                return complement(childListNot, this.universe);
        }
    }

    buildTruthTable(ast) {
        const subexpressionNodes = this.getSubexpressionNodes(ast);
        const atoms = this.getAtomicVariables(ast);
        const constantNodes = subexpressionNodes.filter(({ node }) => node.type === "CONST");
        const compoundNodes = subexpressionNodes.filter(({ node }) => node.type !== "VAR" && node.type !== "CONST");
        const columns = [
            ...atoms,
            ...constantNodes.map(({ expression }) => expression),
            ...compoundNodes.map(({ expression }) => expression)
        ];
        const rows = [];

        const totalRows = Math.pow(2, atoms.length);

        for (let i = 0; i < totalRows; i++) {
            const assignment = {};

            atoms.forEach((atom, index) => {
                const bit = (i >> (atoms.length - index - 1)) & 1;
                assignment[atom] = bit === 1;
            });

            const values = {};

            // Always list atomic variables first to show the binary pattern clearly.
            atoms.forEach((atom) => {
                values[atom] = assignment[atom] ? 1 : 0;
            });

            constantNodes.forEach(({ node, expression }) => {
                values[expression] = this.evaluateBoolean_NODE(node, assignment) ? 1 : 0;
            });

            compoundNodes.forEach(({ node, expression }) => {
                values[expression] = this.evaluateBoolean_NODE(node, assignment) ? 1 : 0;
            });

            rows.push(values);
        }

        return {
            atoms,
            columns,
            rows
        };
    }

    getAtomicVariables(ast) {
        const atomSet = new Set();

        this.walkNode(ast, (node) => {
            if (node.type === "VAR") {
                atomSet.add(node.value);
            }
        });

        return [...atomSet].sort((a, b) => a.localeCompare(b));
    }

    getSubexpressionNodes(ast) {
        const seen = new Set();
        const ordered = [];

        const visit = (node) => {
            if (node.type === "VAR" || node.type === "CONST") {
                const expression = this.astToExpression(node);
                if (!seen.has(expression)) {
                    seen.add(expression);
                    ordered.push({ node, expression });
                }
                return;
            }

            if (node.type === "NOT") {
                visit(node.child);
            } else {
                node.childNodes.forEach(visit);
            }

            const expression = this.astToExpression(node);
            if (!seen.has(expression)) {
                seen.add(expression);
                ordered.push({ node, expression });
            }
        };

        visit(ast);
        return ordered;
    }

    evaluateBoolean_NODE(node, assignment) {
        switch (node.type) {
            case "CONST":
                return node.value;
            case "VAR":
                if (!(node.value in assignment)) {
                    throw new Error(`missing value for variable "${node.value}"`);
                }
                return assignment[node.value];
            case "OR":
                return node.childNodes.some((child) => this.evaluateBoolean_NODE(child, assignment));
            case "AND":
                return node.childNodes.every((child) => this.evaluateBoolean_NODE(child, assignment));
            case "NOT":
                return !this.evaluateBoolean_NODE(node.child, assignment);
            default:
                throw new Error(`unknown node type "${node.type}"`);
        }
    }

    astToExpression(node, parentPrecedence = 0) {
        const currentPrecedence = this.getNodePrecedence(node);
        let expression = "";

        switch (node.type) {
            case "CONST":
                expression = node.value ? "TRUE" : "FALSE";
                break;
            case "VAR":
                expression = node.value;
                break;
            case "NOT": {
                const childExpression = this.astToExpression(node.child, currentPrecedence);
                expression = "!" + childExpression;
                break;
            }
            case "AND":
            case "OR": {
                const operator = node.type === "AND" ? " & " : " | ";
                const parts = node.childNodes.map((child) => this.astToExpression(child, currentPrecedence));
                expression = parts.join(operator);
                break;
            }
            default:
                throw new Error(`unknown node type "${node.type}"`);
        }

        if (currentPrecedence < parentPrecedence) {
            return `(${expression})`;
        }

        return expression;
    }

    getNodePrecedence(node) {
        switch (node.type) {
            case "OR":
                return 1;
            case "AND":
                return 2;
            case "NOT":
                return 3;
            case "VAR":
            case "CONST":
                return 4;
            default:
                return 0;
        }
    }

    walkNode(node, callback) {
        callback(node);

        if (node.type === "NOT") {
            this.walkNode(node.child, callback);
        } else if (node.type === "AND" || node.type === "OR") {
            node.childNodes.forEach((child) => this.walkNode(child, callback));
        }
    }
}

function tokenize(input) {
    const pattern = /[A-Za-z_]+|[&|!()]/g;
    const rawTokens = input.match(pattern) || [];
    const tokens = rawTokens.map(t => evaluateToken(t));
    tokens.push({ type: "EOF", value: null }); //EOF EndOfFile
    return tokens;
}

function evaluateToken(token) {
    const normalized = token.toUpperCase();
    switch (token) {
        case "|":
            return { type: "|", value: token };
        case "&":
            return { type: "&", value: token };
        case "!":
            return { type: "!", value: token };
        case "(":
            return { type: "(", value: token };
        case ")":
            return { type: ")", value: token };
        default:
            if (normalized === "TRUE") {
                return { type: "TRUE", value: "TRUE" };
            }
            if (normalized === "FALSE") {
                return { type: "FALSE", value: "FALSE" };
            }
            return { type: "VAR", value: token };
    }
}

function detectCase(word) {
    if (word === word.toUpperCase()) {
        return 'upper';
    } else {
        return 'lower';
    }
}

function intersectionAll(arrays) {
    if (arrays.length === 0) return [];
    // Take the first array, then keep only those items that appear in *every* other array
    return arrays[0].filter(item =>
        arrays.every(arr => arr.includes(item))
    );
}

function unionAll(arrays) {
    if (arrays.length === 0) return [];
    return [...new Set(arrays.flat())];
}

function complement(array, universe) {
    return universe.filter(x => !array.includes(x));
}
