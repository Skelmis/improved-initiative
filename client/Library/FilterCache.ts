import _ = require("lodash");
import { Listable } from "../../common/Listable";
import { Listing, ListingOrigin } from "./Listing";

function DedupeByRankAndFilterListings<T extends Listing<Listable>>(
  parentSubset: T[],
  filter: string
) {
  const byName: T[] = [];
  const bySearchHint: T[] = [];
  const dedupedItems: Record<string, T> = {};
  const sourceRankings: ListingOrigin[] = [
    "account",
    "localAsync",
    "localStorage",
    "open5e",
    "open5e-additional",
    "server"
  ];

  parentSubset.forEach(listing => {
    const listingMeta = listing.Meta();

    // Ensure that SRD listings appear first
    const sourceSortable =
      listingMeta.FilterDimensions.Source === "Systems Reference Document"
        ? " Systems Reference Document"
        : listingMeta.FilterDimensions.Source;
    const dedupeKey =
      `${listingMeta.Path}-${listingMeta.Name} -${sourceSortable}`.toLocaleLowerCase();

    if (dedupedItems[dedupeKey] == undefined) {
      dedupedItems[dedupeKey] = listing;
      return;
    }

    const currentListing = dedupedItems[dedupeKey];

    const isNewer =
      listingMeta.LastUpdateMs > currentListing.Meta().LastUpdateMs;
    const hasBetterSource =
      sourceRankings.indexOf(listing.Origin) <
      sourceRankings.indexOf(currentListing.Origin);
    if (isNewer || hasBetterSource) {
      dedupedItems[dedupeKey] = listing;
    }
  });

  Object.keys(dedupedItems)
    .sort()
    .forEach(i => {
      const listing = dedupedItems[i];
      if (listing.Meta().Name.toLocaleLowerCase().indexOf(filter) > -1) {
        byName.push(listing);
      } else if (
        listing.Meta().SearchHint.toLocaleLowerCase().indexOf(filter) > -1
      ) {
        bySearchHint.push(listing);
      }
    });

  return byName.concat(bySearchHint);
}

export class FilterCache<T extends Listing<Listable>> {
  private allItems: T[];
  private initialLength: number;
  constructor(initialItems: T[]) {
    this.initializeItems(initialItems);
  }

  private filterCache: Record<string, T[]> = {};

  public UpdateIfItemsChanged(newItems: T[]) {
    if (
      newItems.length != this.initialLength ||
      this.itemsHaveUpdatedMeta(newItems)
    ) {
      this.filterCache = {};
      this.initializeItems(newItems);
    }
  }

  private itemsHaveUpdatedMeta(newItems: T[]) {
    for (let i = 0; i < newItems.length; i++) {
      const newItem = newItems[i];
      const currentItem = this.allItems[i];
      if (!currentItem) {
        return true;
      }
      if (_.isEqual(newItem.Meta(), currentItem.Meta())) {
        return true;
      }
    }
  }

  public GetFilteredEntries = (filter: string) => {
    if (this.filterCache[filter]) {
      return this.filterCache[filter];
    }

    const parentSubset =
      this.filterCache[filter.substr(0, filter.length - 1)] || this.allItems;

    const finalList = DedupeByRankAndFilterListings(parentSubset, filter);

    this.filterCache[filter] = finalList;

    return finalList;
  };

  private initializeItems(items: T[]) {
    this.initialLength = items.length;
    this.allItems = items.filter(i => {
      if (!i.Meta().Name?.length) {
        console.warn("Removing unnamed statblock: " + JSON.stringify(i));
        return false;
      }
      return true;
    });
  }
}
