import { useState } from 'react';
import { currencyRegion } from '../currency-region';
import type { ExchangeAsset } from '../exchange-model';

const regionNames = new Intl.DisplayNames(['fa'], { type: 'region' });

export function AssetSymbol({ asset }: { asset: ExchangeAsset }) {
  const region = currencyRegion(asset);
  const [failedRegion, setFailedRegion] = useState<string | null>(null);
  if (region === undefined)
    return (
      <strong className="ex-tile-symbol" dir="ltr">
        {asset.symbol}
      </strong>
    );
  const label = region
    ? `پرچم ${regionNames.of(region.toUpperCase()) ?? asset.name}`
    : `ارز مشترک یا منطقه‌ای: ${asset.name}`;
  return (
    <strong className="ex-asset-symbol" title={asset.name}>
      {region && failedRegion !== region ? (
        <img
          className="ex-country-flag"
          src={`/flags/countries/${region}.svg`}
          alt={label}
          width="44"
          height="33"
          decoding="async"
          onError={() => setFailedRegion(region)}
        />
      ) : (
        <svg
          className="ex-regional-mark"
          viewBox="0 0 32 32"
          role="img"
          aria-label={label}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="16" cy="16" r="12" />
          <ellipse cx="16" cy="16" rx="5" ry="12" />
          <path d="M4 16h24M6 9h20M6 23h20" />
        </svg>
      )}
    </strong>
  );
}
