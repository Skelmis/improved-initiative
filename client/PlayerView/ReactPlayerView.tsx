import * as React from "react";
import { render as renderReact } from "react-dom";

import { CombatStats } from "../../common/CombatStats";
import { TagState } from "../../common/CombatantState";
import { EncounterState } from "../../common/EncounterState";
import { PlayerViewCombatantState } from "../../common/PlayerViewCombatantState";
import { PlayerViewSettings } from "../../common/PlayerViewSettings";
import { PlayerViewState } from "../../common/PlayerViewState";
import { getDefaultSettings } from "../../common/Settings";
import { PlayerView } from "./components/PlayerView";
import axios from "axios";
import { Socket } from "socket.io-client";

export class ReactPlayerView {
  private playerViewState: PlayerViewState;
  private socket: Socket;

  constructor(
    private element: Element,
    private encounterId: string
  ) {
    this.renderPlayerView({
      encounterState: EncounterState.Default<PlayerViewCombatantState>(),
      settings: getDefaultSettings().PlayerView
    });
  }

  public async LoadEncounterFromServer() {
    try {
      const playerView: PlayerViewState = await axios
        .get(`../playerviews/${this.encounterId}`)
        .then(r => r.data);
      playerView.encounterState =
        playerView.encounterState ||
        EncounterState.Default<PlayerViewCombatantState>();
      playerView.settings =
        playerView.settings || getDefaultSettings().PlayerView;
      this.renderPlayerView(playerView);
    } catch (e) {}
  }

  public ConnectToSocket(socket: Socket) {
    this.socket = socket;
    this.socket.on(
      "encounter updated",
      (encounter: EncounterState<PlayerViewCombatantState>) => {
        this.renderPlayerView({
          encounterState: encounter,
          settings: this.playerViewState.settings,
          combatStats: this.playerViewState.combatStats
        });
      }
    );
    this.socket.on("settings updated", (settings: PlayerViewSettings) => {
      this.renderPlayerView({
        encounterState: this.playerViewState.encounterState,
        settings: settings,
        combatStats: this.playerViewState.combatStats
      });
    });
    this.socket.on("combat stats", (stats: CombatStats) => {
      this.renderPlayerView({
        encounterState: this.playerViewState.encounterState,
        settings: this.playerViewState.settings,
        combatStats: stats
      });
    });

    this.socket.emit("join encounter", this.encounterId);
  }

  private renderPlayerView(newState: PlayerViewState) {
    this.playerViewState = newState;
    document.body.classList.toggle("dark-mode", newState.settings.DarkMode);

    renderReact(
      <PlayerView
        encounterState={this.playerViewState.encounterState}
        settings={this.playerViewState.settings}
        combatStats={this.playerViewState.combatStats}
        onSuggestDamage={this.suggestDamage}
        onSuggestTag={this.suggestTag}
      />,
      this.element
    );
  }

  private suggestDamage = (combatantId: string, damageAmount: number) => {
    if (!this.socket) {
      throw "Player View not attached to socket";
    }
    this.socket.emit(
      "suggest damage",
      this.encounterId,
      [combatantId],
      damageAmount,
      "Player"
    );
  };

  private suggestTag = (combatantId: string, tagState: TagState) => {
    if (!this.socket) {
      throw "Player View not attached to socket";
    }
    this.socket.emit(
      "suggest tag",
      this.encounterId,
      [combatantId],
      tagState,
      "Player"
    );
  };
}
