/**
 * @author Pasecinic Nichita <pasecinic.nichita@isa.utm.md>
 * @date 01.05.2021
 */


import structuredClone, {getRHSDerivations, isNonTerminal, isTerminal} from "../utils/utils";
import {EPSILON, IFirstFollowTable, IProductions, STACK_END, START_SYMBOL} from "../consts";

/**
 * @param productions - all productions
 * @returns firstFollowTable - the first and follow table for each variable
 * */
export const buildFirstFollowTable = (productions: IProductions): IFirstFollowTable => {

    const prodsCopy = structuredClone(productions);

    const firstFollowTable: IFirstFollowTable = {
        first: {},
        follow: {}
    };

    for (let el in prodsCopy) {
        firstFollowTable.first[el] = firstOf(el, prodsCopy);
        firstFollowTable.follow[el] = followOf(el, prodsCopy);
    }

    console.log("\n**FIRST**");
    console.table(firstFollowTable.first);

    console.log("\n**FOLLOW**");
    console.table(firstFollowTable.follow);

    // console.log(firstFollowTable);

    return firstFollowTable;

}

/**
 * @rule
 * - For start symbol always add end of stack symbol ($)
 * - Follow(someState) = First(what goes after the follow symbol in the derivation)
 * e.g. S -> ABCDE
 *      Follow(A) = First(BCDE)
 * - if the symbol to compute Follow for is the last symbol of the derivation
 *   then it's followOf is the follow of the state it got derived from
 * e.g. S -> ABCDE
 *      Follow(E) = Follow(S)
 * - and as well the indirect version:
 * e.g. S -> ABCDE
 *      D -> a | ε
 *      E -> b | ε
 *      C -> c
 *      Follow(C) = First(DE) [a, b, ε] - has epsilon
 *      then:
 *      Follow(C) = First(DE) \ ε + Follow(S)
 *                = [a, b, $]
 *
 * @remarks
 * if variable is in RHS [right hand side]:
 *  iterate over all derivations where it occurs
 *   get the slug (the part of the string from the derivation, which comes after the state)
 *    - if the slug is not empty
 *          merge the result with the First(slug)
 *          - if it will have epsilon then it means the slug can be derived to it
 *            so we get the follow of the state we derived from
 *    - if the slug is empty [is the last right most symbol in derivation]
 *          add to result the Follow(state we derived from)
 *
 * @param state - state to compute the follow of
 * @param productions - all productions
 *
 * @returns res - set of the symbols computed for Follow(state)
 * */
const followOf = (state: string, productions: IProductions): string[] => {

    const prodsCopy = structuredClone(productions);
    let res: string[] = [];

    if (state === START_SYMBOL) res.push(STACK_END);

    let [bool, occurrences] = getRHSDerivations(state, prodsCopy);

    if (bool) {
        for (let derivedFrom in occurrences) {

            let derivations = occurrences[derivedFrom];
            for (let derivation of derivations) {

                const slug = derivation!.split(state)[1];
                if (slug !== '') {
                    res.push(...firstOfNonTerminal(slug, prodsCopy, 0, []));
                    if (res.includes(EPSILON)) {
                        res = res.filter(el => el !== EPSILON);
                        res.push(...followOf(derivedFrom!, prodsCopy));
                    }
                } else {
                    // it is the right most symbols from derivation and it is not deriving from itself
                    if (derivedFrom !== state) res.push(...followOf(derivedFrom!, prodsCopy));
                }

            }

        }

    }

    return [...new Set(res)];

}

/**
 * @rule
 * e.g. A -> aB | Bc | ε
 *      B -> d | ε
 * then
 * First(A) = First(aB) | First(Bc) | First(ε)
 *   First(aB) = First(a)
 *     First(a) = a
 *   First(Bc) = First(B)
 *     First(B) = First(d) | First(ε)
 *            = d | ε
 *            [has epsilon]
 *            then
 *            First(Bc) = d | c  [if B derive ε, then A can derive to c]
 *    First(ε) = ε
 * so First(A) = a | d | c | ε
 *
 * @remarks
 * iterates over possible derivations for the given state:
 *  - if current derivation state starts with a terminal symbol e.g.: a, b:
 *      - add it to result
 *  - if current derivation state starts with a non-terminal symbol ex: A, B:
 *      - add to result the firstOfNonTerminal function returned array
 *
 * @param state       - state to compute firstOf
 * @param productions - the object of all productions
 *
 * @returns res       - the distinct set of the firstOf symbols
 * */
const firstOf = (state: string, productions: IProductions): string[] => {

    const prodsCopy = structuredClone(productions);
    let res: string[] = [];

    const derivations = prodsCopy[state];

    for (let derivation of derivations) {
        const firstChar = derivation.charAt(0);

        if (isTerminal(firstChar)) {
            res.push(firstChar);
        } else if (isNonTerminal(firstChar)) {
            res.push(...firstOfNonTerminal(derivation, prodsCopy, 0, []));
        }

    }

    return [...new Set(res)];

}

/**
 * @remarks
 * gets the symbol at given index position from the given state
 * - if this symbol is non-terminal:
 *      - merge the resulted with the symbols from firstOf(of our non-terminal current symbol)
 *
 * - if is terminal:
 *      - just add it to the result
 *
 * - if the result has epsilon symbol:
 *      - if the symbol is last symbol in the state:
 *          - return result (will contain epsilon)
 *      - else:
 *          - delete epsilon from result array
 *          - merge result with the firstOfNonTerminal() with incremented index position
 *            so next recursive call we will be checking for next character in the same state
 *
 * @param state       - state to check for ex: [AbC]
 * @param productions - all productions
 * @param res         - result array of the symbols (contains duplicates)
 * @param currentPos  - the index of the symbol from state to check for
 *
 * @returns res       - the set of resulted symbols
 * */
const firstOfNonTerminal = (state: string, productions: IProductions, currentPos: number, res: string[]): string[] => {

    let currentChar = state.charAt(currentPos);

    if (isNonTerminal(currentChar)) {
        res.push(...firstOf(currentChar, productions));
    }

    if (isTerminal(currentChar)) {
        res.push(currentChar);
    }

    if (res.includes(EPSILON)) {
        if (currentPos === state.length - 1) return res;
        res = res.filter(el => el !== EPSILON);
        currentPos++;
        res.push(...firstOfNonTerminal(state, productions, currentPos, res));
    }

    return [...new Set(res)];

}
