import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { getGeneric, userID } from '../ViewModels/Get';
import { postGeneric } from '../ViewModels/Post';
import {
    DragDropContext,
    Draggable,
    DraggingStyle,
    Droppable,
    DropResult,
    NotDraggingStyle,
} from 'react-beautiful-dnd';
import produce from 'immer';
import { useNavigate } from 'react-router-dom';
import { idText } from 'typescript';

export interface BoardViewModel {
    _id: string;
    name: string;
    image: {
        color: string;
        thumbnail: string;
        full: string;
    };
}

export interface IssueListTemp {
    name: string;
    content: Issue[];
}

export interface Issue {
    id: string;
    content: string;
}

// fake data generator
export function getIssues(count: number): Issue[] {
    return Array.from({ length: count }, (v, k) => k).map((k) => ({
        id: `issue-${k}`,
        content: `issue ${k}`,
    }));
}

export const dragReducer = produce((state: any, action: any) => {
    switch (action.type) {
        case 'MOVE': {
            state[action.from] = state[action.from] || [];
            state[action.to] = state[action.to] || [];
            const [removed] = state[action.from].splice(action.fromIndex, 1);
            state[action.to].splice(action.toIndex, 0, removed);
            return;
        }
        case 'ADDITEM': {
            state[issueListsNames[action.myIndex]].push(action.addThis);
            return state;
        }
        case 'UPDATE': {
            return state;
        }
        case 'DELETEISSUE': {
            deleteCardFromIssueList(
                action.deleteMe,
                issueListsMIds[action.myIndex],
                state[issueListsNames[action.myIndex]].length
            );
            let newA: Issue[] = new Array();

            state[issueListsNames[action.myIndex]].map((item: Issue, index: number) => {
                if (item.id != action.deleteMe) {
                    console.log(item.id);
                    newA[index] = item;
                }
            });

            state[issueListsNames[action.myIndex]] = newA;

            return state;
        }
        case 'DELETEISSUELIST': {
            let i = 0;
            var newIssueListsMIds = new Array();

            issueListsNames.map((item, index) => {
                if (index === action.deleteMe) {
                    console.log('not adding ' + index);
                    newIssueListsMIds[i] = issueListsMIds[index];
                    state['items' + i.toString()] = null;
                    return item;
                } else {
                    console.log('items' + i);
                    console.log(issueListsNames.length);
                    state['items' + i.toString()] = state[item];
                    newIssueListsMIds[i] = issueListsMIds[index];
                    i++;
                    return item;
                }
            });

            issueListsNames.pop();
            newIssueListsMIds.pop();
            issueListsMIds = newIssueListsMIds;

            return state;
        }
        case 'UPDATELISTS': {
            let i = 0;

            issueListsNames.map((item, index) => {
                if (i == issueListsNames.length - 1) {
                    state[item] = new Array();
                } else {
                    state[item] = state[item];
                    i++;
                }
            });

            return state;
        }
        default:
            throw new Error();
    }
});

var currentBoardId: string;

export async function bordMainSetup(boardNum: number) {
    var boardResponse = await getGeneric('http://localhost:1234/boards/' + userID, 'GET');
    var boardID: string;

    if (boardResponse.board.length == 0) {
        boardResponse = await postGeneric(
            'http://localhost:1234/Board',
            { name: 'testBoard', image: { color: 'green', thumb: 'one.jpg', full: 'true' }, uId: userID },
            'POST'
        );
        boardID = boardResponse.board._id;
    } else {
        boardID = boardResponse.board[boardNum]._id;
    }

    currentBoardId = boardID;

    const listResponse = await getGeneric('http://localhost:1234/lists/' + boardID, 'GET');
    issueListsNames = listResponse.lists.map((item: any, index: number) => {
        return 'items' + index;
    });
    issueListsMIds = listResponse.lists.map((item: any, index: number) => {
        return item._id;
    });

    if (issueListsMIds.length == 0) {
        return;
    }

    /*
    initialState.items0 = [{
        id: '1',
        content: "I'm a hussar",
    }]*/
    var intermidiateState: any = {};

    for (var i = 0; i < issueListsNames.length; i++) {
        let listsCards = await getGeneric('http://localhost:1234/list/' + issueListsMIds[i] + '/cards', 'GET');

        var listArray = new Array();
        for (var j = 0; j < listsCards.cards.length; j++) {
            let listsActiv = await getGeneric(
                'http://localhost:1234/card/' + listsCards.cards[j]._id + '/activitys',
                'GET'
            );
            let pos = listsCards.cards[j].order;
            listArray[pos] = { id: listsCards.cards[j]._id, content: listsActiv.activities[0].text };
        }

        intermidiateState[issueListsNames[i]] = listArray;
    }

    initialState = intermidiateState;

    //THIS IS SOME MAJOR SHIT....
    function intialStateVaribleSetup() {
        const initialStateResponse = listResponse.lists.map(async (item: string, index: number) => {
            let listsCards = await getGeneric('http://localhost:1234/list/' + issueListsMIds[index] + '/cards', 'GET');
            console.log('thats the true issue');
            let listsCardsArray = new Array(listsCards.cards.length);
            listsCards.cards.map(async (cardItem: any) => {
                listsCardsArray[cardItem.order] = { id: cardItem.name, content: 'Wowee' };
            });
            console.log('here');
            console.log(listsCardsArray);
            initialStateResponse[item] = listsCardsArray;
        });
        return initialStateResponse;
    }

    return;
}

export const data: Issue[] = [
    {
        id: '1',
        content: "I'm a hussar",
    },
    {
        id: '2',
        content: "I'm a Hun",
    },
    {
        id: '3',
        content: "I'm a wretched Englishman",
    },
    {
        id: '4',
        content: "I'm a horse soldier",
    },
];

export var initialState: any = { items0: data };

let waitingForDb = false;
export let issueListsNames: string[] = ['items0', 'items1', 'items2'];
export let issueListsMIds: string[] = [];

export async function addToIssueListNames(newValue: string) {
    issueListsNames.push(newValue);
    waitingForDb = true;
    const response = await postGeneric(
        'http://localhost:1234/list',
        { name: newValue, bId: currentBoardId, order: issueListsNames.length - 1 },
        'POST'
    );
    issueListsMIds.push(response.list._id);
    waitingForDb = false;
}

export async function removeFromIssueListNames(indexValue: number) {
    waitingForDb = true;
    const response = await getGeneric('http://localhost:1234/list/' + issueListsMIds[indexValue], 'DELETE');
    waitingForDb = false;
}

export var currentCardId: string;

export async function addIssue(name: string, index: number, content: string, order: number) {
    if (waitingForDb) {
        alert('calme bitte!');
    }
    const response = await postGeneric(
        'http://localhost:1234/card',
        { name: name, lId: issueListsMIds[index], bId: currentBoardId, order: order },
        'POST'
    );
    currentCardId = response.card._id;
    console.log(response);
    console.log(content);
    console.log(currentCardId);
    console.log(currentBoardId);
    const responseNew = await postGeneric(
        'http://localhost:1234/Activity',
        { text: content, cId: currentCardId, bId: currentBoardId },
        'POST'
    );
    return response.card._id;
}

export async function deleteCardFromIssueList(Cid: number, issueListID: string, lastIndex: number) {
    const response = await getGeneric('http://localhost:1234/card/' + Cid, 'GET');

    await moveIssues(issueListID, lastIndex, -1, response.card.order, false);
    await getGeneric('http://localhost:1234/card/' + Cid, 'DELETE');
}

export async function addActivity(name: string, index: number, content: string, order: number) {}

export async function editIssue(listIndex: string, newText: string) {
    const response = await getGeneric('http://localhost:1234/card/' + listIndex + '/activitys', 'GET');
    await getGeneric('http://localhost:1234/activity/' + response.activities[0]._id, 'DELETE');
    const responseNew = await postGeneric(
        'http://localhost:1234/Activity',
        { text: newText, cId: listIndex, bId: currentBoardId },
        'POST'
    );
}

export async function moveIssueInernalList(oldPos: number, newPos: number, listId: string) {
    //const response = await getGeneric('http://localhost:1234/list/'+ listId +'/cards', 'GET');

    var moveDirect = 1;
    if (oldPos < newPos) {
        moveDirect = -1;
    }
    moveIssues(listId, newPos, moveDirect, oldPos, true);
}

export async function moveIssueExternalList(
    oldPos: number,
    newPos: number,
    newList: string,
    oldList: string,
    newListIndex: number
) {
    var response = await getGeneric('http://localhost:1234/list/' + newList + '/cards', 'GET');
    moveIssues(newList, newPos, 1, response.cards.length, false);

    response = await getGeneric('http://localhost:1234/list/' + oldList + '/cards', 'GET');
    response.cards.map(async (item: any) => {
        if (item.order == oldPos) {
            const active = await getGeneric('http://localhost:1234/Card/' + item._id + '/activitys', 'GET');
            addIssue(item.name, newListIndex, active.activities[0].text, newPos);
        }
    });
    moveIssues(oldList, response.cards.length, -1, oldPos, false);
}

async function moveIssues(issueListId: string, moveAt: number, moveDirect: number, me: number, adding: boolean) {
    const response = await getGeneric('http://localhost:1234/list/' + issueListId + '/cards', 'GET');
    response.cards.map(async (item: any) => {
        if (item.order == me) {
            if (adding) {
                await postGeneric('http://localhost:1234/Card/' + item._id, { name: item.name, order: moveAt }, 'PUT');
            } else {
                return;
            }
        }
        if (item.order * moveDirect >= moveAt * moveDirect && me * moveDirect > item.order * moveDirect) {
            await postGeneric(
                'http://localhost:1234/Card/' + item._id,
                { name: item.name, order: item.order + moveDirect },
                'PUT'
            );
        }
    });
}
