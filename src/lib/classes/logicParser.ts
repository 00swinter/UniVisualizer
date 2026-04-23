export type TokenType = "⇒" | "|" | "&" | "!" | "(" | ")" | "TRUE" | "FALSE" | "VAR" | "EOF";

export interface Token {
    type: TokenType;
    value: string | null;
}

export interface ConstNode { type: "CONST"; value: boolean; }
export interface VarNode { type: "VAR"; value: string; }
export interface NotNode { type: "NOT"; child: ASTNode; }
export interface AndNode { type: "AND"; childNodes: ASTNode[]; }
export interface OrNode { type: "OR"; childNodes: ASTNode[]; }
export interface ImplNode {type: "IMPL"; childNodes: ASTNode[];}

export type ASTNode = ConstNode | VarNode | NotNode | AndNode | OrNode | ImplNode;

export interface TruthTableRow {
    [key: string]: number;
}

export interface TruthTable {
    atoms: string[];
    columns: string[];
    rows: TruthTableRow[];
}

export class Lexer {
    public static tokenize(input: string): Token[] {
        const pattern = /[A-Za-z_]+|[⇒&|!()]/g;
        const rawTokens = input.match(pattern) || [];
        const tokens = rawTokens.map(t => Lexer.evaluateToken(t));
        tokens.push({ type: "EOF", value: null });
        return tokens;
    }

    private static evaluateToken(token: string): Token {
        const normalized = token.toUpperCase();
        switch (token) {
            case "⇒": return { type: "⇒", value: token };
            case "|": return { type: "|", value: token };
            case "&": return { type: "&", value: token };
            case "!": return { type: "!", value: token };
            case "(": return { type: "(", value: token };
            case ")": return { type: ")", value: token };
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

    
}

export class SetOperations {
    public static intersectionAll<T>(arrays: T[][]): T[] {
        if (arrays.length === 0) return [];
        return arrays[0].filter(item => arrays.every(arr => arr.includes(item)));
    }

    public static unionAll<T>(arrays: T[][]): T[] {
        if (arrays.length === 0) return [];
        return [...new Set(arrays.flat())];
    }

    public static complement<T>(array: T[], universe: T[]): T[] {
        return universe.filter(x => !array.includes(x));
    }
}

export class TextUtils {
    public static detectCase(word: string): "upper" | "lower" {
        return word === word.toUpperCase() ? "upper" : "lower";
    }
}

export class ASTParser {
    private tokens: Token[];
    private pos: number;

    constructor(expression: string) {
        this.tokens = Lexer.tokenize(expression);
        this.pos = 0;
    }

    public parse(): ASTNode {
        const ast = this.parseImpl();

        if (this.peekToken().type !== "EOF") {
            throw new Error(`Unexpected token "${this.peekToken().value}"`);
        }

        return ast;
    }

    private parseImpl(): ASTNode {
        const childNodes: ASTNode[] = [this.parseOr()];

        while(this.peekValue() === "⇒"){
            this.next("⇒");
            childNodes.push(this.parseOr());
        }

        if(childNodes.length > 1){
            return { type: "IMPL", childNodes };
        }

        return childNodes[0];
        
    }

    private parseOr(): ASTNode {
        const childNodes: ASTNode[] = [this.parseAnd()];

        while (this.peekValue() === "|") {
            this.next("|");
            childNodes.push(this.parseAnd());
        }

        if (childNodes.length > 1) {
            return { type: "OR", childNodes };
        } else {
            return childNodes[0];
        }
    }

    private parseAnd(): ASTNode {
        const childNodes: ASTNode[] = [this.parseNegation()];

        while (this.peekValue() === "&") {
            this.next("&");
            childNodes.push(this.parseNegation());
        }

        if (childNodes.length > 1) {
            return { type: "AND", childNodes };
        } else {
            return childNodes[0];
        }
    }

    private parseNegation(): ASTNode {
        if (this.peekValue() === "!") {
            this.next("!");
            return { type: "NOT", child: this.parseNegation() };
        }
        return this.parseAtom();
    }

    private parseAtom(): ASTNode {
        const token = this.peekToken();
        if (token.type === "TRUE") {
            this.next("TRUE");
            return { type: "CONST", value: true };
        }

        if (token.type === "FALSE") {
            this.next("FALSE");
            return { type: "CONST", value: false };
        }

        if (token.type === "VAR") {
            this.next("VAR");

            if (this.peekToken().type === "VAR") {
                throw new Error("Two variables sequentially is invalid syntax");
            }

            return { type: "VAR", value: token.value as string };
        }

        this.next("(");
        const node = this.parseImpl();
        this.next(")");

        return node;
    }

    private peekValue(): string | null {
        const tk = this.tokens[this.pos];
        return tk ? tk.value : null;
    }

    private peekToken(): Token {
        return this.tokens[this.pos];
    }

    private next(type?: TokenType): Token {
        const token = this.peekToken();

        if (type && type !== token.type) {
            throw new Error(`Expected "${type}" instead of "${token.type}"`);
        }
        this.pos++;
        return token;
    }
}

export class BooleanEvaluator {
    public evaluate(ast: ASTNode, variables: Record<string, boolean>): boolean {
        return this.evaluateNode(ast, variables);
    }

    private evaluateNode(node: ASTNode, variables: Record<string, boolean>): boolean {
        switch (node.type) {
            case "CONST":
                return node.value;
            case "VAR":
                if (!(node.value in variables)) {
                    throw new Error(`Missing value for variable "${node.value}"`);
                }
                return variables[node.value];
            case "OR":
                return node.childNodes.some((child) => this.evaluateNode(child, variables));
            case "AND":
                return node.childNodes.every((child) => this.evaluateNode(child, variables));
            case "NOT":
                return !this.evaluateNode(node.child, variables);
            case "IMPL": {
                let result = node.type === "IMPL" 
                    ? this.evaluateNode(node.childNodes[node.childNodes.length - 1], variables) 
                    : false;
                
                for (let i = node.childNodes.length - 2; i >= 0; i--) {
                    const leftVal = this.evaluateNode(node.childNodes[i], variables);
                    result = !leftVal || result;
                }
                return result;
            }
            default:
                throw new Error(`Unknown node type`);
        }
    }
}

export class TruthTableGenerator {
    public build(ast: ASTNode): TruthTable {
        const subexpressionNodes = this.getSubexpressionNodes(ast);
        const atoms = this.getAtomicVariables(ast);
        const constantNodes = subexpressionNodes.filter(({ node }) => node.type === "CONST");
        const compoundNodes = subexpressionNodes.filter(({ node }) => node.type !== "VAR" && node.type !== "CONST");

        const columns = [
            ...atoms,
            ...constantNodes.map(({ expression }) => expression),
            ...compoundNodes.map(({ expression }) => expression)
        ];

        const rows: TruthTableRow[] = [];
        const totalRows = Math.pow(2, atoms.length);

        for (let i = 0; i < totalRows; i++) {
            const assignment: Record<string, boolean> = {};

            atoms.forEach((atom, index) => {
                const bit = (i >> (atoms.length - index - 1)) & 1;
                assignment[atom] = bit === 1;
            });

            const values: TruthTableRow = {};

            atoms.forEach((atom) => {
                values[atom] = assignment[atom] ? 1 : 0;
            });

            constantNodes.forEach(({ node, expression }) => {
                values[expression] = this.evaluateBooleanNode(node, assignment) ? 1 : 0;
            });

            compoundNodes.forEach(({ node, expression }) => {
                values[expression] = this.evaluateBooleanNode(node, assignment) ? 1 : 0;
            });

            rows.push(values);
        }

        return { atoms, columns, rows };
    }

    private getAtomicVariables(ast: ASTNode): string[] {
        const atomSet = new Set<string>();

        this.walkNode(ast, (node) => {
            if (node.type === "VAR") {
                atomSet.add(node.value);
            }
        });

        return [...atomSet].sort((a, b) => a.localeCompare(b));
    }

    private getSubexpressionNodes(ast: ASTNode): { node: ASTNode; expression: string }[] {
        const seen = new Set<string>();
        const ordered: { node: ASTNode; expression: string }[] = [];

        const visit = (node: ASTNode) => {
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

    private evaluateBooleanNode(node: ASTNode, assignment: Record<string, boolean>): boolean {
        switch (node.type) {
            case "CONST":
                return node.value;
            case "VAR":
                if (!(node.value in assignment)) {
                    throw new Error(`Missing value for variable "${node.value}"`);
                }
                return assignment[node.value];
            case "OR":
                return node.childNodes.some((child) => this.evaluateBooleanNode(child, assignment));
            case "AND":
                return node.childNodes.every((child) => this.evaluateBooleanNode(child, assignment));
            case "NOT":
                return !this.evaluateBooleanNode(node.child, assignment);
            case "IMPL": {
                let result = node.type === "IMPL" 
                    ? this.evaluateBooleanNode(node.childNodes[node.childNodes.length - 1], assignment) 
                    : false; 
                
                for (let i = node.childNodes.length - 2; i >= 0; i--) {
                    const leftVal = this.evaluateBooleanNode(node.childNodes[i], assignment);
                    result = !leftVal || result;
                }
                return result;
            }
            default:
                throw new Error(`Unknown node type`);
        }
    }

    private astToExpression(node: ASTNode, parentPrecedence = 0): string {
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
            case "IMPL": {
                const parts = node.childNodes.map((child) => this.astToExpression(child, currentPrecedence));
                expression = parts.join(" ⇒ ");
                break;
            }
            default:
                throw new Error(`Unknown node type`);
        }

        if (currentPrecedence < parentPrecedence) {
            return `(${expression})`;
        }

        return expression;
    }

    private getNodePrecedence(node: ASTNode): number {
        switch (node.type) {
            case "IMPL": return 1;
            case "OR": return 2;
            case "AND": return 3;
            case "NOT": return 4;
            case "VAR":
            case "CONST": return 5;
            default: return 0;
        }
    }

    private walkNode(node: ASTNode, callback: (node: ASTNode) => void): void {
        callback(node);

        if (node.type === "NOT") {
            this.walkNode(node.child, callback);
        } else if (node.type === "AND" || node.type === "OR" || node.type === "IMPL") {
            node.childNodes.forEach((child) => this.walkNode(child, callback));
        }

    }
}