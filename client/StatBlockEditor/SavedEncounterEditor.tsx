import { FieldArray, Form, Formik } from "formik";
import * as React from "react";

import { SavedEncounter } from "../../common/SavedEncounter";
import { Button } from "../Components/Button";
import { env } from "../Environment";
import { ListingButton } from "../Library/Components/ListingButton";
import { TextField } from "./components/TextField";

export function SavedEncounterEditor(props: {
  savedEncounter: SavedEncounter;
  onSave: (newSavedEncounter: SavedEncounter) => void;
  onClose: () => void;
}) {
  return (
    <Formik
      initialValues={props.savedEncounter}
      onSubmit={props.onSave}
      children={api => {
        return (
          <Form
            className="c-statblock-editor"
            autoComplete="false"
            translate="no"
            onSubmit={api.handleSubmit}
          >
            <div className="c-statblock-editor__title-row">
              <h2 className="c-statblock-editor__title">
                Edit Saved Encounter
              </h2>
              <Button
                onClick={props.onClose}
                tooltip="Cancel"
                fontAwesomeIcon="times"
              />
              <Button
                onClick={api.submitForm}
                tooltip="Save"
                fontAwesomeIcon="save"
              />
            </div>

            <TextField label="Saved Encounter Name" fieldName="Name" />
            <TextField label="Folder" fieldName="Path" />
            {env.HasEpicInitiative && (
              <TextField
                label="Background Image URL"
                fieldName="BackgroundImageUrl"
              />
            )}
            <FieldArray name="Combatants">
              {fieldArrayApi => {
                return api.values.Combatants.map((combatant, index) => (
                  <div className="inline">
                    <ListingButton
                      onClick={() => fieldArrayApi.remove(index)}
                      buttonClass="remove"
                      faClass="times"
                    />
                    {combatant.StatBlock.Name}
                  </div>
                ));
              }}
            </FieldArray>
          </Form>
        );
      }}
    />
  );
}
