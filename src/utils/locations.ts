export const SRI_LANKA_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", 
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", 
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", 
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export function isValidDistrict(district: string): boolean {
  if (!district) return false;
  const clean = district.trim().toLowerCase();
  return SRI_LANKA_DISTRICTS.some(d => d.toLowerCase() === clean);
}

export const cityToDistrict: Record<string, string> = {
  "colombo": "Colombo", "kaduwela": "Colombo", "maharagama": "Colombo", "malabe": "Colombo", "dehiwala": "Colombo", "moratuwa": "Colombo", "homagama": "Colombo", "avissawella": "Colombo", "padukka": "Colombo", "nugegoda": "Colombo", "battaramulla": "Colombo", "kolonnawa": "Colombo", "kotikawatta": "Colombo", "mulleriyawa": "Colombo", "hanwella": "Colombo", "kesbewa": "Colombo", "boralesgamuwa": "Colombo", "pita kotte": "Colombo", "sri jayawardenepura kotte": "Colombo", "mount lavinia": "Colombo", "ratmalana": "Colombo", "pannipitiya": "Colombo", "kottawa": "Colombo", "hokandara": "Colombo", "thalawathugoda": "Colombo", "koswatta": "Colombo", "angoda": "Colombo", "wellampitiya": "Colombo", "piliyandala": "Colombo", "matteoda": "Colombo", "kahathuduwa": "Colombo", "godagama": "Colombo", "meegoda": "Colombo", "watareka": "Colombo", "puwakpitiya": "Colombo", "kosgama": "Colombo", "salawa": "Colombo", "kaluaggala": "Colombo", "meepe": "Colombo", "handapangoda": "Colombo", "horagala": "Colombo", "kiriwattuduwa": "Colombo", "diganahalli": "Colombo", "kiriwandala": "Colombo", "batawala": "Colombo", "waga": "Colombo", "thummodara": "Colombo", "puwakpitiya south": "Colombo", "nawagamuwa": "Colombo", "ranala": "Colombo", "habarakada": "Colombo", "panagoda": "Colombo", "godagama south": "Colombo", "homagama south": "Colombo", "pitipana": "Colombo", "niwandama": "Colombo", "makumbura": "Colombo", "rukmalgama": "Colombo", "pelawatta": "Colombo", "akurugoda": "Colombo", "thalahena": "Colombo", "madiwela": "Colombo", "udahamulla": "Colombo", "navinna": "Colombo", "wijerama": "Colombo", "gangodawila": "Colombo", "kohuwala": "Colombo", "kalubowila": "Colombo", "nedimala": "Colombo", "attidiya": "Colombo", "rathmalana": "Colombo", "moratumulla": "Colombo", "willorawatta": "Colombo", "koralawella": "Colombo", "egoda uyana": "Colombo", "katubedda": "Colombo", "rawathawatta": "Colombo", "lunawa": "Colombo", "angulana": "Colombo", "kaldemulla": "Colombo", "galkissa": "Colombo", "dehiwala south": "Colombo", "dehiwala north": "Colombo", "wellawatta": "Colombo", "bambalapitiya": "Colombo", "kollupitiya": "Colombo", "slave island": "Colombo", "fort": "Colombo", "pettah": "Colombo", "hulftsdorp": "Colombo", "maradana": "Colombo", "panchikawatta": "Colombo", "maligawatta": "Colombo", "grandpass": "Colombo", "bloemendhal": "Colombo", "kotahena": "Colombo", "modara": "Colombo", "mattakkuliya": "Colombo", "dematagoda": "Colombo", "borella": "Colombo", "cinnamon gardens": "Colombo", "kirulapone": "Colombo", "pamankada": "Colombo", "havelock town": "Colombo", "narahenpita": "Colombo", "rajagiriya": "Colombo", "nawala": "Colombo", "ethul kotte": "Colombo",
  "gampaha": "Gampaha", "negombo": "Gampaha", "kelaniya": "Gampaha", "kadawatha": "Gampaha", "wattala": "Gampaha", "minuwangoda": "Gampaha", "ja-ela": "Gampaha", "biyagama": "Gampaha", "peliyagoda": "Gampaha", "kandana": "Gampaha", "ragama": "Gampaha", "mabole": "Gampaha", "nittambuwa": "Gampaha", "veyangoda": "Gampaha", "divulapitiya": "Gampaha", "mirigama": "Gampaha", "kiribathgoda": "Gampaha", "yakkala": "Gampaha", "ganemulla": "Gampaha", "seeduwa": "Gampaha", "katunayake": "Gampaha", "dompe": "Gampaha", "pugoda": "Gampaha", "radawana": "Gampaha", "weliweriya": "Gampaha", "delgoda": "Gampaha", "biyagama south": "Gampaha", "biyagama north": "Gampaha", "makola": "Gampaha", "sapugaskanda": "Gampaha", "gonawala": "Gampaha", "pamunuwila": "Gampaha", "dalugama": "Gampaha", "hunupitiya": "Gampaha", "enderamulla": "Gampaha", "mahabage": "Gampaha", "kerawalapitiya": "Gampaha", "dikowita": "Gampaha", "hendala": "Gampaha", "palliyawatta": "Gampaha", "nayakakanda": "Gampaha", "kerawalapitiya south": "Gampaha", "kerawalapitiya north": "Gampaha", "mabole south": "Gampaha", "mabole north": "Gampaha", "welisara": "Gampaha", "ragama south": "Gampaha", "ragama north": "Gampaha", "kandana south": "Gampaha", "kandana north": "Gampaha", "ja-ela south": "Gampaha", "ja-ela north": "Gampaha", "ekala": "Gampaha", "niwandama south": "Gampaha", "niwandama north": "Gampaha", "seeduwa south": "Gampaha", "seeduwa north": "Gampaha", "katunayake south": "Gampaha", "katunayake north": "Gampaha", "andiambalama": "Gampaha", "kovinna": "Gampaha", "minuwangoda south": "Gampaha", "minuwangoda north": "Gampaha", "divulapitiya south": "Gampaha", "divulapitiya north": "Gampaha", "mirigama south": "Gampaha", "mirigama north": "Gampaha", "pasyala": "Gampaha", "nittambuwa south": "Gampaha", "nittambuwa north": "Gampaha", "veyangoda south": "Gampaha", "veyangoda north": "Gampaha", "yakkala south": "Gampaha", "yakkala north": "Gampaha", "gampaha south": "Gampaha", "gampaha north": "Gampaha", "ganemulla south": "Gampaha", "ganemulla north": "Gampaha", "kadawatha south": "Gampaha", "kadawatha north": "Gampaha", "kiribathgoda south": "Gampaha", "kiribathgoda north": "Gampaha", "kelaniya south": "Gampaha", "kelaniya north": "Gampaha", "peliyagoda south": "Gampaha", "peliyagoda north": "Gampaha",
  "kalutara": "Kalutara", "panadura": "Kalutara", "horana": "Kalutara", "beruwala": "Kalutara", "matugama": "Kalutara", "bandaragama": "Kalutara", "wadduwa": "Kalutara", "aluthgama": "Kalutara", "payagala": "Kalutara", "dodangoda": "Kalutara", "agalawatta": "Kalutara", "bulathsinhala": "Kalutara", "ingiriya": "Kalutara", "madurawela": "Kalutara", "millaniya": "Kalutara", "palindanuwara": "Kalutara", "walallawita": "Kalutara",
  "kandy": "Kandy", "gampola": "Kandy", "nawalapitiya": "Kandy", "peradeniya": "Kandy", "katugastota": "Kandy", "kadugannawa": "Kandy", "wattegama": "Kandy", "akurana": "Kandy", "gelioya": "Kandy", "pilimathalawa": "Kandy", "kundasale": "Kandy", "udunuwara": "Kandy", "yatinuwara": "Kandy", "pathadumbara": "Kandy", "panvila": "Kandy", "ududumbara": "Kandy", "minipe": "Kandy", "medadumbara": "Kandy", "gangawata korale": "Kandy", "harispattuwa": "Kandy", "hatharaliyadda": "Kandy", "thumpane": "Kandy", "pasbage korale": "Kandy", "ganga ihala korale": "Kandy", "udapalatha": "Kandy", "delthota": "Kandy", "pathahewaheta": "Kandy",
  "matale": "Matale", "dambulla": "Matale", "sigiriya": "Matale", "galewela": "Matale", "ukuwela": "Matale", "rattota": "Matale", "naula": "Matale", "pallepola": "Matale", "yatawatta": "Matale", "ambanganga korale": "Matale", "laggala-pallegama": "Matale", "wilgamuwa": "Matale",
  "nuwara eliya": "Nuwara Eliya", "hatton": "Nuwara Eliya", "talawakele": "Nuwara Eliya", "nildandahinna": "Nuwara Eliya", "ragala": "Nuwara Eliya", "kotagala": "Nuwara Eliya", "bogawantalawa": "Nuwara Eliya", "maskeliya": "Nuwara Eliya", "lindula": "Nuwara Eliya", "ambagamuwa": "Nuwara Eliya", "hanguranketha": "Nuwara Eliya", "kothmale": "Nuwara Eliya", "walapane": "Nuwara Eliya",
  "galle": "Galle", "hikkaduwa": "Galle", "ambalangoda": "Galle", "karapitiya": "Galle", "elapitiya": "Galle", "baddegama": "Galle", "ahungalla": "Galle", "batapola": "Galle", "imaduwa": "Galle", "neluwa": "Galle", "pitigala": "Galle", "raddegama": "Galle", "uruwela": "Galle", "akmeemana": "Galle", "ampegama": "Galle", "balapitiya": "Galle", "benthota": "Galle", "bope-poddala": "Galle", "habaraduwa": "Galle", "karandeniya": "Galle", "niyagama": "Galle", "thawalama": "Galle", "welivitiya-divithura": "Galle", "yakkalamulla": "Galle", "gonapinuwala": "Galle",
  "matara": "Matara", "weligama": "Matara", "dikwella": "Matara", "akuressa": "Matara", "kamburupitiya": "Matara", "deniyaya": "Matara", "hakmana": "Matara", "morawaka": "Matara", "urubokka": "Matara", "athuraliya": "Matara", "devinuwara": "Matara", "kirinda puhulwella": "Matara", "kotapola": "Matara", "malimbada": "Matara", "mulatiyana": "Matara", "pasgoda": "Matara", "pitabeddara": "Matara", "thihagoda": "Matara", "welipitiya": "Matara",
  "hambantota": "Hambantota", "tangalle": "Hambantota", "beliatta": "Hambantota", "tissamaharama": "Hambantota", "ambalantota": "Hambantota", "weeraketiya": "Hambantota", "walasmulla": "Hambantota", "suriyawewa": "Hambantota", "middeniya": "Hambantota", "angunukolapelessa": "Hambantota", "katuwana": "Hambantota", "lunugamvehera": "Hambantota", "okewela": "Hambantota",
  "jaffna": "Jaffna", "chavakachcheri": "Jaffna", "point pedro": "Jaffna", "nallur": "Jaffna", "valvettithurai": "Jaffna", "karainagar": "Jaffna", "kopay": "Jaffna", "chunnakam": "Jaffna", "delft": "Jaffna", "island north": "Jaffna", "island south": "Jaffna", "karaveddy": "Jaffna", "maruthankerney": "Jaffna", "sandilipay": "Jaffna", "tellippalai": "Jaffna", "uduvil": "Jaffna",
  "kilinochchi": "Kilinochchi", "pallai": "Kilinochchi", "paranthan": "Kilinochchi", "pooneryn": "Kilinochchi", "kandavalai": "Kilinochchi", "karachchi": "Kilinochchi", "pachchilaipalli": "Kilinochchi",
  "mannar": "Mannar", "murunkan": "Mannar", "pesalai": "Mannar", "nanaddan": "Mannar", "madhu": "Mannar", "manthai west": "Mannar", "musali": "Mannar",
  "vavuniya": "Vavuniya", "chedikulam": "Vavuniya", "nedunkeni": "Vavuniya", "vavuniya north": "Vavuniya", "vavuniya south": "Vavuniya",
  "mullaitivu": "Mullaitivu", "pudukuduirippu": "Mullaitivu", "mankulam": "Mullaitivu", "mallavi": "Mullaitivu", "manthai east": "Mullaitivu", "maritimepattu": "Mullaitivu", "oddusuddan": "Mullaitivu", "thunukkai": "Mullaitivu", "welioya": "Mullaitivu",
  "batticaloa": "Batticaloa", "kattankudy": "Batticaloa", "eravur": "Batticaloa", "valachchenai": "Batticaloa", "kaluwanchikudy": "Batticaloa", "aralaiyur": "Batticaloa", "chenkalady": "Batticaloa", "oddmavadi": "Batticaloa", "koralai pattu": "Batticaloa", "manmunai": "Batticaloa", "porativu pattu": "Batticaloa",
  "ampara": "Ampara", "kalmunai": "Ampara", "samanthurai": "Ampara", "akkaraipattu": "Ampara", "pottuvil": "Ampara", "uhana": "Ampara", "maha oya": "Ampara", "padiyathalawa": "Ampara", "dehiattakandiya": "Ampara", "nintavur": "Ampara", "addalachchenai": "Ampara", "alavadivambu": "Ampara", "damana": "Ampara", "irakkamam": "Ampara", "karativu": "Ampara", "lahugala": "Ampara", "namal oya": "Ampara", "navithanveli": "Ampara", "thirukkovil": "Ampara",
  "trincomalee": "Trincomalee", "kinniya": "Trincomalee", "muttur": "Trincomalee", "kantale": "Trincomalee", "nilaveli": "Trincomalee", "kuchchaveli": "Trincomalee", "thampalakamam": "Trincomalee", "gomarankadawala": "Trincomalee", "morawewa": "Trincomalee", "padavi sri pura": "Trincomalee", "seruvila": "Trincomalee", "town and gravets": "Trincomalee", "verugal": "Trincomalee",
  "kurunegala": "Kurunegala", "kuliyapitiya": "Kurunegala", "polgahawela": "Kurunegala", "pannala": "Kurunegala", "narammala": "Kurunegala", "wariyapola": "Kurunegala", "giriulla": "Kurunegala", "alawwa": "Kurunegala", "bingiriya": "Kurunegala", "galgamuwa": "Kurunegala", "hiripitiya": "Kurunegala", "ibbagamuwa": "Kurunegala", "mawathagama": "Kurunegala", "nikaweratiya": "Kurunegala", "amabanpola": "Kurunegala", "bamunakotuwa": "Kurunegala", "ehetuwewa": "Kurunegala", "ganewatta": "Kurunegala", "giribawa": "Kurunegala", "kobeigane": "Kurunegala", "kotawehera": "Kurunegala", "maho": "Kurunegala", "mallawapitiya": "Kurunegala", "maspotha": "Kurunegala", "panduwasnuwara": "Kurunegala", "polpithigama": "Kurunegala", "rasnayakapura": "Kurunegala", "ridigama": "Kurunegala", "udubaddawa": "Kurunegala", "weerambugedara": "Kurunegala",
  "puttalam": "Puttalam", "chilaw": "Puttalam", "nennapuwa": "Puttalam", "wennappuwa": "Puttalam", "marawila": "Puttalam", "dankotuwa": "Puttalam", "nattandiya": "Puttalam", "madampe": "Puttalam", "anamaduwa": "Puttalam", "kalpitiya": "Puttalam", "arachchikattuwa": "Puttalam", "karuwalagaswewa": "Puttalam", "mahakumbukkadawala": "Puttalam", "mundalama": "Puttalam", "nawagattegama": "Puttalam", "pallama": "Puttalam", "vanathavilluwa": "Puttalam",
  "anuradhapura": "Anuradhapura", "kekirawa": "Anuradhapura", "tambuttegama": "Anuradhapura", "medawachchiya": "Anuradhapura", "eppawala": "Anuradhapura", "galenbindunuwewa": "Anuradhapura", "galnewa": "Anuradhapura", "habarana": "Anuradhapura", "kahatagasdigiliya": "Anuradhapura", "kebithigollewa": "Anuradhapura", "mihintale": "Anuradhapura", "nochiya": "Anuradhapura", "padaviya": "Anuradhapura", "talawa": "Anuradhapura", "horowpothana": "Anuradhapura", "ipalogama": "Anuradhapura", "nachchadoowa": "Anuradhapura", "nuwaragam palatha": "Anuradhapura", "palagala": "Anuradhapura", "palugaswewa": "Anuradhapura", "rajanganaya": "Anuradhapura", "rambewa": "Anuradhapura", "thirappane": "Anuradhapura",
  "polonnaruwa": "Polonnaruwa", "hingurakgoda": "Polonnaruwa", "medirigiriya": "Polonnaruwa", "kaduruwela": "Polonnaruwa", "aralaganwila": "Polonnaruwa", "bakamoona": "Polonnaruwa", "dibulagala": "Polonnaruwa", "minneriya": "Polonnaruwa", "welikanda": "Polonnaruwa", "elahera": "Polonnaruwa", "lankapura": "Polonnaruwa", "thamankaduwa": "Polonnaruwa",
  "badulla": "Badulla", "bandarawela": "Badulla", "haputale": "Badulla", "mahiyanganaya": "Badulla", "passara": "Badulla", "diyatalawa": "Badulla", "hali-ela": "Badulla", "ella": "Badulla", "haliela": "Badulla", "weliada": "Badulla", "welimada": "Badulla", "meegahakivula": "Badulla", "kandaketiya": "Badulla", "haldummulla": "Badulla", "lunugala": "Badulla", "rideemaliyadda": "Badulla", "soranathota": "Badulla", "uva paranagama": "Badulla",
  "moneragala": "Moneragala", "monaragala": "Monaragala", "wellawaya": "Monaragala", "kataragama": "Monaragala", "buttala": "Monaragala", "bibile": "Monaragala", "medagama": "Monaragala", "siyambalanduwa": "Monaragala", "badalkumbura": "Monaragala", "sevanagala": "Monaragala", "tanamalwila": "Monaragala", "katharagama": "Monaragala", "madulla": "Monaragala", "thanamalvila": "Monaragala",
  "ratnapura": "Ratnapura", "pelmadulla": "Ratnapura", "balangoda": "Ratnapura", "embilipitiya": "Ratnapura", "eheliyagoda": "Ratnapura", "kuruwita": "Ratnapura", "nivithigala": "Ratnapura", "kahawatta": "Ratnapura", "rakwana": "Ratnapura", "kalawana": "Ratnapura", "godakawela": "Ratnapura", "ayagama": "Ratnapura", "impe": "Ratnapura", "kolonna": "Ratnapura", "niwithigala": "Ratnapura", "opanayaka": "Ratnapura", "weligepola": "Ratnapura",
  "kegalle": "Kegalle", "mawanella": "Kegalle", "warakapola": "Kegalle", "rambukkana": "Kegalle", "ruwanwella": "Kegalle", "galigamuwa": "Kegalle", "yatiyantota": "Kegalle", "deraniyagala": "Kegalle", "bulathkohupitiya": "Kegalle", "dehiowita": "Kegalle", "arunayaka": "Kegalle"
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function resolveDistrict(city: string): Promise<string> {
  if (!city) return '';
  const cleanCity = city.trim().toLowerCase();
  
  // 0. Direct match against 25 official districts using word boundaries
  for (const district of SRI_LANKA_DISTRICTS) {
    const regex = new RegExp(`\\b${district}\\b`, 'i');
    if (regex.test(cleanCity)) {
      return district;
    }
  }

  // 1. Check Dictionary with word boundaries to prevent partial matches
  // We want to see if the input city string contains any of our known cities.
  // Or, more simply, if the input city exactly matches a known city.
  // Let's try exact match first, then partial match.
  if (cityToDistrict[cleanCity]) {
    return cityToDistrict[cleanCity];
  }

  for (const [key, district] of Object.entries(cityToDistrict)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(cleanCity)) {
      return district;
    }
  }
  
  // 2. Check Online (Nominatim API) with up to 3 retries using different queries
  if (navigator.onLine) {
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try different variations of the query to increase chances of finding a result
    const queries = [
      `${cleanCity}, Sri Lanka`,
      cleanCity,
      `${cleanCity.split(' ')[0]}, Sri Lanka` // Try just the first word
    ];
    
    while (attempts < maxAttempts) {
      try {
        const currentQuery = queries[attempts] || queries[0];
        
        // Nominatim has a strict 1 request per second limit
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(currentQuery)}&format=json&addressdetails=1`);
        
        // Wait 1 second to respect rate limits before returning
        await delay(1000);
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            // Check top 3 results to increase chances of finding a valid district
            for (let i = 0; i < Math.min(data.length, 3); i++) {
              const address = data[i].address;
              if (!address) continue;
              
              // Check all possible fields that might contain the district name
              const possibleFields = [
                address.state_district,
                address.county,
                address.state,
                address.region,
                address.city,
                address.town,
                address.village,
                address.suburb,
                address.municipality
              ];
              
              for (const field of possibleFields) {
                if (!field) continue;
                const cleanField = field.replace(/ District/gi, '').trim().toLowerCase();
                
                // Try to find a match in the 25 official districts
                const matchedDistrict = SRI_LANKA_DISTRICTS.find(d => {
                  const lowerD = d.toLowerCase();
                  return cleanField === lowerD || cleanField.includes(lowerD);
                });
                
                if (matchedDistrict) {
                  return matchedDistrict;
                }
              }
            }
          }
          // If we got a successful response but no matching district, we will retry with the next query
          attempts++;
        } else {
          // If response is not ok (e.g., 502 Bad Gateway), we will retry with the same query? 
          // No, just move to the next attempt to avoid getting stuck
          attempts++;
        }
      } catch (e) {
        console.error(`Geocoding failed (Attempt ${attempts + 1}/${maxAttempts})`, e);
        attempts++;
        if (attempts < maxAttempts) {
          await delay(2000); // Wait a bit longer before retrying on error
        }
      }
    }
  }
  
  return '';
}
