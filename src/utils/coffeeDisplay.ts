// src/utils/coffeeDisplay.ts

import { SessionCoffee, TastingSession } from '../types/domain';

export type CoffeeViewerRole = 'master' | 'taster';

export function getCoffeeSampleLabel(coffee: SessionCoffee): string {
  return `Muestra #${coffee.tableLabel}`;
}

export function shouldHideCoffeeName(args: {
  session: TastingSession | null;
  viewerRole: CoffeeViewerRole;
}): boolean {
  const { session, viewerRole } = args;

  if (!session?.isBlind) {
    return false;
  }

  if (viewerRole === 'taster') {
    return true;
  }

  return !!session.hideNamesFromMaster;
}

export function getCoffeeDisplayName(args: {
  coffee: SessionCoffee;
  session: TastingSession | null;
  viewerRole: CoffeeViewerRole;
}): string {
  const { coffee, session, viewerRole } = args;
  const sampleLabel = getCoffeeSampleLabel(coffee);

  if (
    shouldHideCoffeeName({
      session,
      viewerRole,
    })
  ) {
    return sampleLabel;
  }

  return `${sampleLabel} — ${coffee.name}`;
}

export function canShowCoffeeMetadata(args: {
  session: TastingSession | null;
  viewerRole: CoffeeViewerRole;
}): boolean {
  return !shouldHideCoffeeName(args);
}