import * as React from "react";
import { SavedEncounter } from "../../../common/SavedEncounter";
import { linkComponentToObservables } from "../../Combatant/linkComponentToObservables";
import { LibrariesCommander } from "../../Commands/LibrariesCommander";
import { Listing } from "../Listing";
import { ListingGroup } from "../Components/BuildListingTree";
import { LibraryReferencePane } from "./LibraryReferencePane";
import { ListingRow } from "../Components/ListingRow";
import { Library } from "../useLibrary";

export type EncounterLibraryReferencePaneProps = {
  librariesCommander: LibrariesCommander;
  library: Library<SavedEncounter>;
};

type EncounterListing = Listing<SavedEncounter>;

export class EncounterLibraryReferencePane extends React.Component<
  EncounterLibraryReferencePaneProps
> {
  constructor(props: EncounterLibraryReferencePaneProps) {
    super(props);
    linkComponentToObservables(this);
  }

  public render(): JSX.Element {
    const listings = this.props.library.GetAllListings();
    return (
      <LibraryReferencePane
        listings={listings}
        defaultItem={SavedEncounter.Default()}
        renderListingRow={this.renderListingRow}
        listingGroups={this.listingGroups}
        addNewItem={this.props.librariesCommander.SaveEncounter}
        addNewText="Save Current Encounter"
        renderPreview={this.renderPreview}
      />
    );
  }

  private listingGroups: ListingGroup[] = [
    { groupFn: l => ({ key: l.Meta().Path }) }
  ];

  private renderListingRow = (l: EncounterListing, onPreview, onPreviewOut) => {
    const listingMeta = l.Meta();
    return (
      <ListingRow
        key={listingMeta.Id + listingMeta.Path + listingMeta.Name}
        name={listingMeta.Name}
        onAdd={this.loadSavedEncounter}
        onDelete={this.deleteListing}
        onMove={this.moveListing}
        onPreview={onPreview}
        onPreviewOut={onPreviewOut}
        listing={l}
        showCount
      />
    );
  };

  private renderPreview = (encounter: SavedEncounter) => (
    <ul className="c-encounter-preview">
      {encounter.Combatants.map(c => (
        <li key={c.Id}>{c.Alias || c.StatBlock.Name}</li>
      ))}
    </ul>
  );

  private loadSavedEncounter = (listing: EncounterListing) => {
    listing.GetAsyncWithUpdatedId(this.props.librariesCommander.LoadEncounter);
    return true;
  };

  private deleteListing = (listing: EncounterListing) => {
    if (confirm(`Delete saved encounter "${listing.Meta().Name}"?`)) {
      this.props.library.DeleteListing(listing.Meta().Id);
    }
  };

  private moveListing = (listing: EncounterListing) => {
    this.props.librariesCommander.MoveEncounter(listing);
  };
}
