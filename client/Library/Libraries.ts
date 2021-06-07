import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { AccountClient } from "../Account/AccountClient";
import { Store } from "../Utility/Store";
import { ObservableBackedLibrary } from "./ObservableBackedLibrary";
import { SavedEncounter } from "../../common/SavedEncounter";
import { PersistentCharacter } from "../../common/PersistentCharacter";
import { now } from "moment";

export type UpdatePersistentCharacter = (
  persistentCharacterId: string,
  updates: Partial<PersistentCharacter>
) => void;

export const LibraryFriendlyNames = {
  StatBlocks: "Creatures",
  PersistentCharacters: "Characters",
  Encounters: "Encounters",
  Spells: "Spells"
};
export type LibraryType = keyof typeof LibraryFriendlyNames;

export function GetDefaultForLibrary(libraryType: LibraryType) {
  if (libraryType === "StatBlocks") {
    return StatBlock.Default();
  }
  if (libraryType === "PersistentCharacters") {
    return PersistentCharacter.Default();
  }
  if (libraryType === "Encounters") {
    return SavedEncounter.Default();
  }
  if (libraryType === "Spells") {
    return Spell.Default();
  }

  return null;
}

export interface Libraries {
  PersistentCharacters: ObservableBackedLibrary<PersistentCharacter>;
  UpdatePersistentCharacter: UpdatePersistentCharacter;
  StatBlocks: ObservableBackedLibrary<StatBlock>;
  Encounters: ObservableBackedLibrary<SavedEncounter>;
  Spells: ObservableBackedLibrary<Spell>;
}

export class AccountBackedLibraries {
  public PersistentCharacters: ObservableBackedLibrary<PersistentCharacter>;
  public StatBlocks: ObservableBackedLibrary<StatBlock>;
  public Encounters: ObservableBackedLibrary<SavedEncounter>;
  public Spells: ObservableBackedLibrary<Spell>;

  constructor(
    accountClient: AccountClient,
    loadingFinished?: (storeName: string) => void
  ) {
    this.PersistentCharacters = new ObservableBackedLibrary<PersistentCharacter>(
      Store.PersistentCharacters,
      "persistentcharacters",
      PersistentCharacter.Default,
      {
        accountSave: accountClient.SavePersistentCharacter,
        accountDelete: accountClient.DeletePersistentCharacter,
        getFilterDimensions: PersistentCharacter.GetFilterDimensions,
        getSearchHint: PersistentCharacter.GetSearchHint,
        loadingFinished
      }
    );
    this.StatBlocks = new ObservableBackedLibrary<StatBlock>(
      Store.StatBlocks,
      "statblocks",
      StatBlock.Default,
      {
        accountSave: accountClient.SaveStatBlock,
        accountDelete: accountClient.DeleteStatBlock,
        getFilterDimensions: StatBlock.FilterDimensions,
        getSearchHint: StatBlock.GetSearchHint,
        loadingFinished
      }
    );
    this.Encounters = new ObservableBackedLibrary<SavedEncounter>(
      Store.SavedEncounters,
      "encounters",
      SavedEncounter.Default,
      {
        accountSave: accountClient.SaveEncounter,
        accountDelete: accountClient.DeleteEncounter,
        getFilterDimensions: () => ({}),
        getSearchHint: SavedEncounter.GetSearchHint,
        loadingFinished
      }
    );

    this.Spells = new ObservableBackedLibrary<Spell>(Store.Spells, "spells", Spell.Default, {
      accountSave: accountClient.SaveSpell,
      accountDelete: accountClient.DeleteSpell,
      getFilterDimensions: Spell.GetFilterDimensions,
      getSearchHint: Spell.GetSearchHint,
      loadingFinished
    });

    this.initializeStatBlocks();
    this.initializeSpells();
  }

  public UpdatePersistentCharacter = async (
    persistentCharacterId: string,
    updates: Partial<PersistentCharacter>
  ) => {
    if (updates.StatBlock) {
      updates.Name = updates.StatBlock.Name;
      updates.Path = updates.StatBlock.Path;
      updates.Version = updates.StatBlock.Version;
    }

    const currentCharacterListing = await this.PersistentCharacters.GetOrCreateListingById(
      persistentCharacterId
    );

    const currentCharacter = await currentCharacterListing.GetWithTemplate(
      PersistentCharacter.Default()
    );

    const updatedCharacter = {
      ...currentCharacter,
      ...updates,
      LastUpdateMs: now()
    };

    return await this.PersistentCharacters.SaveEditedListing(
      currentCharacterListing,
      updatedCharacter
    );
  };

  private initializeStatBlocks = () => {
    $.ajax("../statblocks/").done(listings => {
      if (!listings) {
        return;
      }
      return this.StatBlocks.AddListings(listings, "server");
    });
  };

  private initializeSpells = () => {
    $.ajax("../spells/").done(listings => {
      if (!listings) {
        return;
      }
      return this.Spells.AddListings(listings, "server");
    });
  };
}
