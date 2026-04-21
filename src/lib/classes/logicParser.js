export default class LogicParser {
    constructor() {
    }

    parse_AST(expression) {
        this.tokens = tokenize(expression);
        this.pos = 0;
        let ast = this.parse_OR();
        console.log("ast:_________", ast);
        return ast;
    }
    parse_OR() {
        console.log(`OR pos:${this.pos}`);

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
        console.log(`AND pos:${this.pos}`);
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
        console.log(`NEG pos:${this.pos}`);
        if (this.peekValue() == "!") {
            this.next("!");
            return { type: "NOT", child: this.parse_NEGATION() };
        }
        return this.parse_ATOM();
    }
    parse_ATOM() {//expression | literal | variable (expression can be boild down to literall so its on the same level)
        console.log(`ATOM pos:${this.pos}`);
        let token = this.peekToken();
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
        console.log("TOKEN: ", token);
        console.log("TYPE INPUT: ", type);

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
}

function tokenize(input) {
    const pattern = /[A-Za-z_]+|[&|!()]/g;
    const rawTokens = input.match(pattern) || [];
    const tokens = rawTokens.map(t => evaluateToken(t));
    tokens.push({ type: "EOF", value: null }); //EOF EndOfFile
    console.log(tokens);
    return tokens;
}

function evaluateToken(token) {
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
