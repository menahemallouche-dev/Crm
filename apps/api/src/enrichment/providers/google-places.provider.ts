import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompanyDataProvider, ProviderResult } from "../types";

/**
 * Google Places API — Google Maps / Google Business presence: adresse,
 * téléphone, site web, avis, note, coordonnées GPS.
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 */
@Injectable()
export class GooglePlacesProvider implements CompanyDataProvider {
  readonly name = "google_maps";
  private readonly logger = new Logger(GooglePlacesProvider.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("GOOGLE_PLACES_API_KEY"));
  }

  async fetch(company: { name: string; city?: string | null }): Promise<ProviderResult> {
    try {
      const apiKey = this.config.get<string>("GOOGLE_PLACES_API_KEY");
      const query = encodeURIComponent(`${company.name} ${company.city ?? ""}`);
      const findRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id&key=${apiKey}`,
      );
      const findData: any = await findRes.json();
      const placeId = findData?.candidates?.[0]?.place_id;
      if (!placeId) {
        return { provider: this.name, status: "FAILED", fields: {}, errorMessage: "Aucun établissement trouvé" };
      }
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,formatted_phone_number,website,rating,user_ratings_total,geometry,url&key=${apiKey}`,
      );
      const details: any = await detailsRes.json();
      const r = details?.result;
      return {
        provider: this.name,
        status: "COMPLETED",
        fields: {
          address: r?.formatted_address,
          phone: r?.formatted_phone_number,
          website: r?.website,
          googleRating: r?.rating,
          googleReviewsCount: r?.user_ratings_total,
          googleMapsUrl: r?.url,
          latitude: r?.geometry?.location?.lat,
          longitude: r?.geometry?.location?.lng,
        },
        raw: details,
      };
    } catch (error) {
      this.logger.warn(`Google Places indisponible: ${(error as Error).message}`);
      return { provider: this.name, status: "FAILED", fields: {}, errorMessage: (error as Error).message };
    }
  }
}
