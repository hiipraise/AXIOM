// src/lib/nigeriaStates.ts
// Nigeria's 36 states + FCT.
// Constitutional since 1996 — won't change.

export interface NigeriaState {
  key: string;      // lowercase, sent as API param
  label: string;    // display name
  cities: string[]; // first = primary city for Adzuna `where`
}

export const NIGERIA_STATES: NigeriaState[] = [
  { key: "abia",        label: "Abia",        cities: ["Aba", "Umuahia"] },
  { key: "adamawa",     label: "Adamawa",     cities: ["Yola", "Mubi"] },
  { key: "akwa ibom",   label: "Akwa Ibom",   cities: ["Uyo", "Eket"] },
  { key: "anambra",     label: "Anambra",     cities: ["Awka", "Onitsha", "Nnewi"] },
  { key: "bauchi",      label: "Bauchi",      cities: ["Bauchi"] },
  { key: "bayelsa",     label: "Bayelsa",     cities: ["Yenagoa"] },
  { key: "benue",       label: "Benue",       cities: ["Makurdi", "Gboko"] },
  { key: "borno",       label: "Borno",       cities: ["Maiduguri"] },
  { key: "cross river", label: "Cross River", cities: ["Calabar"] },
  { key: "delta",       label: "Delta",       cities: ["Asaba", "Warri"] },
  { key: "ebonyi",      label: "Ebonyi",      cities: ["Abakaliki"] },
  { key: "edo",         label: "Edo",         cities: ["Benin City", "Auchi"] },
  { key: "ekiti",       label: "Ekiti",       cities: ["Ado-Ekiti"] },
  { key: "enugu",       label: "Enugu",       cities: ["Enugu", "Nsukka"] },
  { key: "fct",         label: "FCT (Abuja)", cities: ["Abuja"] },
  { key: "gombe",       label: "Gombe",       cities: ["Gombe"] },
  { key: "imo",         label: "Imo",         cities: ["Owerri", "Orlu"] },
  { key: "jigawa",      label: "Jigawa",      cities: ["Dutse", "Hadejia"] },
  { key: "kaduna",      label: "Kaduna",      cities: ["Kaduna", "Zaria"] },
  { key: "kano",        label: "Kano",        cities: ["Kano"] },
  { key: "katsina",     label: "Katsina",     cities: ["Katsina"] },
  { key: "kebbi",       label: "Kebbi",       cities: ["Birnin Kebbi"] },
  { key: "kogi",        label: "Kogi",        cities: ["Lokoja"] },
  { key: "kwara",       label: "Kwara",       cities: ["Ilorin"] },
  { key: "lagos",       label: "Lagos",       cities: ["Lagos", "Ikeja", "Lekki", "Victoria Island"] },
  { key: "nasarawa",    label: "Nasarawa",    cities: ["Lafia"] },
  { key: "niger",       label: "Niger",       cities: ["Minna"] },
  { key: "ogun",        label: "Ogun",        cities: ["Abeokuta", "Sagamu"] },
  { key: "ondo",        label: "Ondo",        cities: ["Akure"] },
  { key: "osun",        label: "Osun",        cities: ["Osogbo", "Ile-Ife"] },
  { key: "oyo",         label: "Oyo",         cities: ["Ibadan", "Ogbomoso"] },
  { key: "plateau",     label: "Plateau",     cities: ["Jos"] },
  { key: "rivers",      label: "Rivers",      cities: ["Port Harcourt"] },
  { key: "sokoto",      label: "Sokoto",      cities: ["Sokoto"] },
  { key: "taraba",      label: "Taraba",      cities: ["Jalingo"] },
  { key: "yobe",        label: "Yobe",        cities: ["Damaturu"] },
  { key: "zamfara",     label: "Zamfara",     cities: ["Gusau"] },
];