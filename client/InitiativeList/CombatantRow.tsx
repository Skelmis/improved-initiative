import * as React from "react";

import { CombatantState } from "../../common/CombatantState";
import { Tags } from "./Tags";
import { CommandContext } from "./CommandContext";
import { SettingsContext } from "../Settings/SettingsContext";
import { Command } from "../Commands/Command";
import { useSubscription } from "../Combatant/linkComponentToObservables";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";

import Tippy from "@tippyjs/react";
import { SketchPicker } from "react-color";

type CombatantRowProps = {
  combatantState: CombatantState;
  isActive: boolean;
  isSelected: boolean;
  showIndexLabel: boolean;
  initiativeIndex: number;
};

type CombatantDragData = {
  type: "combatant";
  id: string;
};

export function CombatantRow(props: CombatantRowProps) {
  const displayName = getDisplayName(props);
  const commandContext = React.useContext(CommandContext);

  const {
    DisplayPortraits,
    DisplayHPBar,
    DisplayCombatantColor,
    DisplayReactionTracker
  } = React.useContext(SettingsContext).TrackerView;

  const { combatantState, isSelected, isActive } = props;
  const { StatBlock } = combatantState;

  const selectCombatant = (mouseEvent?: React.MouseEvent) => {
    const appendSelection =
      mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey);
    commandContext.SelectCombatant(props.combatantState.Id, appendSelection);
  };

  const [, drag] = useDrag({
    item: {
      id: props.combatantState.Id,
      initiativeIndex: props.initiativeIndex,
      type: "combatant"
    }
  });

  const [collectedProps, drop] = useDrop({
    accept: "combatant",
    drop: (dragData: CombatantDragData) => {
      if (combatantState.Id !== dragData.id) {
        commandContext.MoveCombatantFromDrag(dragData.id, combatantState.Id);
      }
    },
    collect: (monitor: DropTargetMonitor) => {
      if (!monitor.isOver() || monitor.getItemType() !== "combatant") {
        return {
          id: null,
          initiativeIndex: null
        };
      }
      return {
        id: monitor.getItem().id,
        initiativeIndex: monitor.getItem().initiativeIndex
      };
    }
  });

  const classNames = getClassNames(props);
  if (collectedProps.initiativeIndex !== null) {
    if (collectedProps.initiativeIndex > props.initiativeIndex) {
      classNames.push("drop-before");
    }
    if (collectedProps.initiativeIndex < props.initiativeIndex) {
      classNames.push("drop-after");
    }
  }

  return (
    <tr
      ref={node => drag(drop(node))}
      className={classNames.join(" ")}
      onClick={selectCombatant}
    >
      {
        <td className="combatant__left-gutter">
          <i className="fas fa-grip-vertical" />
        </td>
      }
      <td className="combatant__initiative" title="Initiative Roll">
        {props.combatantState.InitiativeGroup && <i className="fas fa-link" />}
        {props.combatantState.Initiative}
      </td>

      <td aria-hidden="true" className="combatant__image-cell">
        {DisplayPortraits && (
          <img
            src={StatBlock.ImageURL || "/img/logo-improved-initiative.svg"}
            alt="" // Image is only decorative
            className="combatant__image"
            height={35}
            width={35}
          />
        )}
      </td>

      <td
        className="combatant__name"
        title={displayName}
        align="left"
        aria-current={isActive ? "true" : "false"}
      >
        {DisplayCombatantColor && (
          <CombatantColorPicker combatantState={props.combatantState} />
        )}
        {props.combatantState.Hidden && (
          <Tippy content="Hidden from Player View">
            <span className="combatant__hidden-icon fas fa-eye-slash" />
          </Tippy>
        )}
        <button
          className="combatant__selection-button"
          onClick={e => {
            e.stopPropagation();
            selectCombatant(e);
          }}
          aria-pressed={isSelected ? "true" : "false"}
        >
          {displayName}
        </button>
      </td>

      <td
        className="combatant__hp"
        style={getHPStyle(props)}
        onClick={event => {
          commandContext.ApplyDamageToCombatant(props.combatantState.Id);
          event.stopPropagation();
        }}
      >
        <span
          className="combatant__mobile-icon fas fa-heart"
          aria-hidden="true"
        />

        {renderHPText(props)}
        {DisplayHPBar && (
          <span className="combatant__hp-bar">
            <span
              className="combatant__hp-bar--filled"
              style={renderHPBarStyle(props)}
            />
          </span>
        )}
      </td>

      <td className="combatant__ac">
        <span
          className="combatant__mobile-icon fas fa-shield-alt"
          aria-hidden="true"
        />

        {props.combatantState.StatBlock.AC.Value}
        {props.combatantState.RevealedAC && (
          <Tippy content="Revealed in Player View">
            <span className="combatant__ac--revealed-badge fas fa-eye" />
          </Tippy>
        )}
      </td>

      <td className="combatant__tags-commands-cell">
        <div className="combatant__tags-commands-wrapper">
          <Tags
            tags={props.combatantState.Tags}
            combatantId={props.combatantState.Id}
          />
          <Commands />
          {DisplayReactionTracker && (
            <ReactionIndicator combatantState={props.combatantState} />
          )}
        </div>
      </td>
    </tr>
  );
}

function ReactionIndicator(props: { combatantState: CombatantState }) {
  const commandContext = React.useContext(CommandContext);

  if (!props.combatantState.ReactionsSpent) {
    return (
      <Tippy content="Reaction">
        <span
          className="combatant__reaction-icon fas fa-reply"
          onClick={() =>
            commandContext.ToggleCombatantSpentReaction(props.combatantState.Id)
          }
        />
      </Tippy>
    );
  } else {
    return (
      <Tippy content="Reaction">
        <span
          className="combatant__reaction-icon fas fa-minus"
          onClick={() =>
            commandContext.ToggleCombatantSpentReaction(props.combatantState.Id)
          }
        />
      </Tippy>
    );
  }
}

function CombatantColorPicker(props: { combatantState: CombatantState }) {
  const commandContext = React.useContext(CommandContext);
  const hasColorSet =
    props.combatantState.Color && props.combatantState.Color.length > 0;

  return (
    <Tippy
      trigger="click"
      interactive
      appendTo={document.body}
      content={
        <SketchPicker
          color={props.combatantState.Color || ""}
          disableAlpha
          onChangeComplete={color =>
            commandContext.SetCombatantColor(props.combatantState.Id, color.hex)
          }
        />
      }
    >
      {hasColorSet ? (
        <span
          className="combatant__color fas fa-circle"
          style={{ color: props.combatantState.Color }}
        />
      ) : (
        <span className="combatant__color far fa-circle" />
      )}
    </Tippy>
  );
}

function Commands() {
  const commandContext = React.useContext(CommandContext);

  return (
    <div className="combatant__commands">
      {commandContext.CombatantCommands.map(c => (
        <CommandButton command={c} key={c.Id} />
      ))}
    </div>
  );
}

function CommandButton(props: { command: Command }) {
  const { command } = props;
  const showInCombatantRow = useSubscription(command.ShowInCombatantRow);
  const fontAwesomeIcon = useSubscription(command.FontAwesomeIcon);
  if (!showInCombatantRow) {
    return null;
  }
  return (
    <Tippy content={`${command.Description} [${command.KeyBinding}]`}>
      <button
        className={
          "combatant__command-button fa-clickable fa-" + fontAwesomeIcon
        }
        onClick={command.ActionBinding}
        aria-label={command.Description}
      ></button>
    </Tippy>
  );
}

function getClassNames(props: CombatantRowProps) {
  const classNames = ["combatant"];
  if (props.isActive) {
    classNames.push("active");
  }
  if (props.isSelected) {
    classNames.push("selected");
  }
  return classNames;
}

function getDisplayName(props: CombatantRowProps) {
  let displayName = props.combatantState.StatBlock.Name;
  if (props.combatantState.Alias?.length) {
    displayName = props.combatantState.Alias;
  } else if (props.showIndexLabel) {
    displayName += " " + props.combatantState.IndexLabel;
  }
  return displayName;
}

function getHPStyle(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value,
    currentHP = props.combatantState.CurrentHP;
  // Do not set green any higher, low value is needed for contrast against light background
  const green = Math.floor((currentHP / maxHP) * 120);
  const red = Math.floor(((maxHP - currentHP) / maxHP) * 170);
  return { color: "rgb(" + red + "," + green + ",0)" };
}

function renderHPText(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value;
  if (props.combatantState.TemporaryHP) {
    return `${props.combatantState.CurrentHP}+${props.combatantState.TemporaryHP}/${maxHP}`;
  } else {
    return `${props.combatantState.CurrentHP}/${maxHP}`;
  }
}
function renderHPBarStyle(props: CombatantRowProps) {
  const maxHP = props.combatantState.StatBlock.HP.Value,
    currentHP = props.combatantState.CurrentHP;
  return { width: Math.floor((currentHP / maxHP) * 100) + "%" };
}
