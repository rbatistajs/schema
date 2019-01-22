import * as sinon from "sinon";
import * as assert from "assert";

import { DataChange } from './../src/annotations';
import { State, Player } from "./Schema";

describe("Change API", () => {

    it("should trigger onChange with a single value", () => {
        const state = new State();
        state.fieldNumber = 50;

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "fieldNumber");
            assert.equal(changes[0].value, 50);
            assert.equal(changes[0].previousValue, undefined);
        }

        const onChangeSpy = sinon.spy(decodedState, 'onChange');

        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
    })

    it("should trigger onChange with multiple values", () => {
        const state = new State();
        state.fieldNumber = 50;
        state.fieldString = "Hello world!";

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 2);
            assert.equal(changes[0].field, "fieldNumber");
            assert.equal(changes[0].value, 50);
            assert.equal(changes[0].previousValue, undefined);

            assert.equal(changes[1].field, "fieldString");
            assert.equal(changes[1].value, "Hello world!");
            assert.equal(changes[1].previousValue, undefined);
        }
        let onChangeSpy = sinon.spy(decodedState, 'onChange');

        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        state.fieldNumber = 100;
        state.fieldString = "Again";

        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 2);
            assert.equal(changes[0].field, "fieldNumber");
            assert.equal(changes[0].value, 100);
            assert.equal(changes[0].previousValue, 50);

            assert.equal(changes[1].field, "fieldString");
            assert.equal(changes[1].value, "Again");
            assert.equal(changes[1].previousValue, "Hello world!");
        }
        onChangeSpy = sinon.spy(decodedState, 'onChange');

        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
    });

    it("should trigger onChange on child objects", () => {
        const state = new State();
        state.player = new Player("Jake", 10, 10);

        let playerSpy: sinon.SinonSpy;

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "player");

            // not having a previous value means this is a new object
            // which would only define the `onChange` function once per object.
            if (!changes[0].previousValue) {
                const player = changes[0].value as Player;
                player.onChange = function(changes: DataChange[]) {
                    assert.equal(changes.length, 1);
                    assert.equal(changes[0].field, "name");
                    assert.equal(changes[0].value, "Snake");
                    assert.equal(changes[0].previousValue, "Jake");
                }

                playerSpy = sinon.spy(player, 'onChange');
            }
        }
        let onChangeSpy = sinon.spy(decodedState, 'onChange');

        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        state.player.name = "Snake";

        // overwrite `onChange` for second decode
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
        }
        onChangeSpy = sinon.spy(decodedState, 'onChange');

        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
        sinon.assert.calledOnce(playerSpy);
    });

    it("detecting onChange on arrays", () => {
        const state = new State();
        state.arrayOfPlayers = [new Player("Jake Badlands"), new Player("Katarina Lyons")];

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "arrayOfPlayers");
            assert.equal(changes[0].value.length, 2);

            assert.equal(changes[0].value[0].name, "Jake Badlands");
            assert.equal(changes[0].value[1].name, "Katarina Lyons");
        }

        let onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        state.arrayOfPlayers.push(new Player("Snake Sanders"));
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "arrayOfPlayers");
            assert.equal(changes[0].value.length, 1);

            assert.equal(changes[0].value[0].name, "Snake Sanders");
        }

        onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
    });

    it("detecting onRemove on array items", () => {
        const state = new State();
        state.arrayOfPlayers = [new Player("Jake Badlands"), new Player("Katarina Lyons")];

        let katarina: Player;

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            katarina = changes[0].value[1];
            assert.ok(katarina instanceof Player);
        };

        let onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        state.arrayOfPlayers.splice(1);

        katarina.onRemove = function () {}
        const onItemRemoveSpy = sinon.spy(katarina, "onRemove");

        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
        }

        onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
        sinon.assert.calledOnce(onItemRemoveSpy);
    });

    it("detecting onChange on maps", () => {
        const state = new State();
        state.mapOfPlayers = {
            'jake': new Player("Jake Badlands"),
            'katarina': new Player("Katarina Lyons"),
        };

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "mapOfPlayers");
            assert.equal(Object.keys(changes[0].value).length, 2);

            assert.equal(changes[0].value.jake.name, "Jake Badlands");
            assert.equal(changes[0].value.katarina.name, "Katarina Lyons");
        }

        let onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        state.mapOfPlayers['snake'] = new Player("Snake Sanders");
        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
            assert.equal(changes[0].field, "mapOfPlayers");
            assert.equal(Object.keys(changes[0].value).length, 3);

            assert.equal(changes[0].value.snake.name, "Snake Sanders");
        }

        onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
    });

    it("detecting onRemove on map items", () => {
        const state = new State();
        state.mapOfPlayers = {
            'jake': new Player("Jake Badlands"),
            'katarina': new Player("Katarina Lyons"),
        };

        let katarina: Player;

        const decodedState = new State();
        decodedState.onChange = function(changes: DataChange[]) {
            katarina = changes[0].value.katarina;
            assert.ok(katarina instanceof Player);
        }

        let onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);

        delete state.mapOfPlayers['katarina'];
        katarina.onRemove = function () {}
        const onItemRemoveSpy = sinon.spy(katarina, "onRemove");

        decodedState.onChange = function(changes: DataChange[]) {
            assert.equal(changes.length, 1);
        }

        onChangeSpy = sinon.spy(decodedState, 'onChange');
        decodedState.decode(state.encode());
        sinon.assert.calledOnce(onChangeSpy);
        sinon.assert.calledOnce(onItemRemoveSpy);
    });

});