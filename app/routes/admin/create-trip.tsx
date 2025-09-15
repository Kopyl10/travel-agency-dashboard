// app/routes/admin/create-trip.tsx
import { useState } from "react";
import {
  Form,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import {
  LayerDirective,
  LayersDirective,
  MapsComponent,
} from "@syncfusion/ej2-react-maps";

import Header from "~/components/Header";
import { comboBoxItems, selectItems } from "~/constants";
import { world_map } from "~/constants/world_map";
import { account } from "~/appwrite/client";
import { cn, formatKey } from "~/lib/utils";

type Country = {
  name: string; // e.g. "🇺🇸 United States"
  coordinates: [number, number]; // [lat, lng]
  value: string; // e.g. "United States"
  openStreetMap?: string;
};

type TripFormData = {
  country: string;
  travelStyle: string;
  interest: string;
  budget: string;
  duration: number;
  groupType: string;
};

type CreateTripResponse = { id?: string };

export function meta() {
  return [
    { title: "Create Trip" },
    { name: "description", content: "Create a Personalized Trip" },
  ];
}

export async function loader(_args: LoaderFunctionArgs) {
  const response = await fetch("https://restcountries.com/v3.1/all");
  const data = await response.json();

  const countries: Country[] = data.map((country: any) => ({
    name: `${country.flag} ${country.name.common}`,
    coordinates: country.latlng as [number, number],
    value: country.name.common,
    openStreetMap: country.maps?.openStreetMaps,
  }));

  return countries;
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const countries = useLoaderData() as Country[];

  const [formData, setFormData] = useState<TripFormData>({
    country: countries[0]?.value || "",
    travelStyle: "",
    interest: "",
    budget: "",
    duration: 0,
    groupType: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof TripFormData, value: string | number) =>
    setFormData((s) => ({ ...s, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (
      !formData.country ||
      !formData.travelStyle ||
      !formData.interest ||
      !formData.budget ||
      !formData.groupType
    ) {
      setError("Please provide input for all fields");
      setLoading(false);
      return;
    }
    if (formData.duration < 1 || formData.duration > 10) {
      setError("Duration must be between 1 and 10 days");
      setLoading(false);
      return;
    }

    const user = await account.get();
    if (!user.$id) {
      console.error("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch("/api/create-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country,
          numberOfDays: formData.duration,
          travelStyle: formData.travelStyle,
          interests: formData.interest,
          budget: formData.budget,
          groupType: formData.groupType,
          userId: user.$id,
        }),
      });

      const result: CreateTripResponse = await resp.json();

      // if your detail route lives under /admin, push there:
      if (result?.id) navigate(`/admin/trip-detail/${result.id}`);
      else console.error("Failed to generate itinerary");
    } catch (err) {
      console.error("Error generating itinerary:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = countries.find((c) => c.value === formData.country);
  const mapData = [
    {
      country: formData.country,
      color: "#EA382E",
      coordinates: selectedCountry?.coordinates ?? [],
    },
  ];

  const countryData = countries.map((c) => ({ text: c.name, value: c.value }));

  return (
    <main className="flex flex-col gap-10 pb-20 wrapper">
      <Header
        title="Add a New Trip"
        description="View and edit AI-generated travel plans"
      />

      <section className="mt-2.5 wrapper-md">
        <form className="trip-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="country">Country</label>
            <ComboBoxComponent
              id="country"
              dataSource={countryData}
              fields={{ text: "text", value: "value" }}
              placeholder="Select a Country"
              change={(e: { value?: string }) => {
                if (e.value) handleChange("country", e.value);
              }}
              className="combo-box"
              allowFiltering
              filtering={(e: any) => {
                const query = String(e.text ?? "").toLowerCase();
                e.updateData(
                  countries
                    .filter((c) => c.name.toLowerCase().includes(query))
                    .map((c) => ({ text: c.name, value: c.value }))
                );
              }}
            />
          </div>

          <div>
            <label htmlFor="duration">Duration</label>
            <input
              id="duration"
              name="duration"
              type="number"
              min={1}
              max={10}
              onChange={(e) => handleChange("duration", Number(e.target.value))}
              placeholder="Enter number of days (1–10)"
              className="form-input placeholder:text-gray-100"
            />
          </div>

          {selectItems.map((key) => (
            <div key={key}>
              <label htmlFor={key}>{formatKey(key)}</label>
              <ComboBoxComponent
                id={key}
                dataSource={comboBoxItems[key].map((item) => ({
                  text: item,
                  value: item,
                }))}
                fields={{ text: "text", value: "value" }}
                placeholder={`Select ${key}`}
                change={(e: { value?: string }) => {
                  if (e.value) handleChange(key as keyof TripFormData, e.value);
                }}
                allowFiltering
                filtering={(e: any) => {
                  const q = String(e.text ?? "").toLowerCase();
                  e.updateData(
                    comboBoxItems[key]
                      .filter((item) => item.toLowerCase().includes(q))
                      .map((item) => ({ text: item, value: item }))
                  );
                }}
                className="combo-box"
              />
            </div>
          ))}

          <div>
            <label htmlFor="location">Location on map</label>
            <MapsComponent>
              <LayersDirective>
                <LayerDirective
                  shapeData={world_map}
                  dataSource={mapData}
                  shapePropertyPath="name"
                  shapeDataPath="country"
                  shapeSettings={{ colorValuePath: "color", fill: "#E5E5E5" }}
                />
              </LayersDirective>
            </MapsComponent>
          </div>

          <div className="bg-gray-200 h-px w-full" />

          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}

          <footer className="px-6 w-full">
            <ButtonComponent
              type="submit"
              className="button-class !h-12 !w-full"
              disabled={loading}
            >
              <img
                src={`/assets/icons/${loading ? "loader.svg" : "magic-star.svg"}`}
                alt="magic star"
                className={cn("size-5", { "animate-spin": loading })}
              />
              <span className="p-16-semibold text-white">
                {loading ? "Generating..." : "Generate Itinerary"}
              </span>
            </ButtonComponent>
          </footer>
        </form>
      </section>
    </main>
  );
}
