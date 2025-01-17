/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * Recoil DevTools browser extension.
 *
 * @emails oncall+recoil
 * @flow strict-local
 * @format
 * @oncall recoil
 */
'use strict';

import type {
  BackgroundPostMessage,
  RecoilDevToolsActionsType,
  ValuesMessageType,
} from '../types/DevtoolsTypes';

const {RecoilDevToolsActions} = require('../constants/Constants');
const Connection = require('./Connection');

class Store {
  connections: Map<number, Connection>;
  connectionIndex: number;
  subscriptions: Set<chrome$Port>;
  lastConnection: ?string;

  constructor() {
    this.connections = new Map();
    this.connectionIndex = 0;
    this.subscriptions = new Set();
  }

  connect(
    connectionId: number,
    persistenceLimit?: number,
    initialValues?: ValuesMessageType,
    displayName: ?string,
    devMode: ?boolean,
    port: chrome$Port,
  ) {
    this.connections.set(
      connectionId,
      new Connection(
        connectionId,
        persistenceLimit,
        initialValues,
        displayName,
        devMode,
        port,
      ),
    );
    this.connectionIndex++;
    this.trigger(RecoilDevToolsActions.CONNECT, {connectionId});
  }

  disconnect(connectionId: number): void {
    this.connections.delete(connectionId);
    this.trigger(RecoilDevToolsActions.DISCONNECT, {connectionId});
  }

  hasConnection(id: number): boolean {
    return this.connections.has(id);
  }

  getConnection(id: ?number): ?Connection {
    if (id == null) {
      return null;
    }
    return this.connections.get(id);
  }

  getConnectionsArray(): Array<Connection> {
    return Array.from(this.connections.values());
  }

  getNewConnectionIndex(): number {
    return this.connectionIndex;
  }

  getLastConnectionId(): number {
    return Array.from(this.connections)[this.connections.size - 1]?.[0] ?? null;
  }

  subscribe(popup: chrome$Port) {
    if (!this.subscriptions.has(popup)) {
      this.subscriptions.add(popup);
    }
  }

  unsubscribe(popup: chrome$Port) {
    this.subscriptions.delete(popup);
  }

  processMessage(msg: BackgroundPostMessage, connectionId: number) {
    const connection = this.connections.get(connectionId);

    if (connection == null) {
      return;
    }

    const msgId = connection.processMessage(msg);

    this.trigger(RecoilDevToolsActions.UPDATE_STORE, {connectionId, msgId});
  }

  trigger(
    evt: RecoilDevToolsActionsType,
    data: {connectionId: number, msgId?: number, ...},
  ): void {
    for (const popup of this.subscriptions) {
      popup.postMessage({
        action: evt,
        connectionId: data.connectionId,
        msgId: data.msgId,
      });
    }
  }
}

module.exports = Store;
