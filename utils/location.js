const Location = require("../models/Location");

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest city from user's location
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @returns {object} Nearest city
 */
async function findNearestCity(latitude, longitude) {
  try {
    const cities = await Location.find();

    if (cities.length === 0) {
      return null;
    }

    let nearestCity = null;
    let minDistance = Infinity;

    cities.forEach((city) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        city.latitude,
        city.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    return {
      city: nearestCity,
      distance: minDistance.toFixed(2),
    };
  } catch (error) {
    console.error("Error in findNearestCity:", error);
    throw error;
  }
}

/**
 * Get all locations
 */
async function getAllLocations() {
  try {
    return await Location.find().sort({ name: 1 });
  } catch (error) {
    console.error("Error in getAllLocations:", error);
    throw error;
  }
}

/**
 * Add new location
 */
async function addLocation(data) {
  try {
    const location = new Location(data);
    await location.save();
    return location;
  } catch (error) {
    console.error("Error in addLocation:", error);
    throw error;
  }
}

/**
 * Initialize default locations if database is empty
 */
async function initializeDefaultLocations() {
  try {
    // Database tayyor bo'lishini kutish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const count = await Location.countDocuments().maxTimeMS(20000);

    if (count === 0) {
      const defaultCities = [
        // Asosiy shaharlar
        {
          name: "Toshkent",
          nameUz: "Toshkent",
          nameCr: "Тошкент",
          nameRu: "Ташкент",
          apiName: "Tashkent",
          latitude: 41.2995,
          longitude: 69.2401,
        },
        {
          name: "Samarqand",
          nameUz: "Samarqand",
          nameCr: "Самарқанд",
          nameRu: "Самарканд",
          apiName: "Samarkand",
          latitude: 39.627,
          longitude: 66.975,
        },
        {
          name: "Buxoro",
          nameUz: "Buxoro",
          nameCr: "Бухоро",
          nameRu: "Бухара",
          apiName: "Bukhara",
          latitude: 39.7747,
          longitude: 64.4286,
        },
        {
          name: "Andijon",
          nameUz: "Andijon",
          nameCr: "Андижон",
          nameRu: "Андижан",
          apiName: "Andijan",
          latitude: 40.7821,
          longitude: 72.3442,
        },
        {
          name: "Namangan",
          nameUz: "Namangan",
          nameCr: "Наманган",
          nameRu: "Наманган",
          apiName: "Namangan",
          latitude: 40.9983,
          longitude: 71.6726,
        },
        {
          name: "Farg'ona",
          nameUz: "Farg'ona",
          nameCr: "Фарғона",
          nameRu: "Фергана",
          apiName: "Fergana",
          latitude: 40.3864,
          longitude: 71.7864,
        },
        {
          name: "Nukus",
          nameUz: "Nukus",
          nameCr: "Нукус",
          nameRu: "Нукус",
          apiName: "Nukus",
          latitude: 42.4531,
          longitude: 59.6103,
        },
        {
          name: "Urganch",
          nameUz: "Urganch",
          nameCr: "Урганч",
          nameRu: "Ургенч",
          apiName: "Urgench",
          latitude: 41.55,
          longitude: 60.6333,
        },
        {
          name: "Xiva",
          nameUz: "Xiva",
          nameCr: "Хива",
          nameRu: "Хива",
          apiName: "Khiva",
          latitude: 41.3781,
          longitude: 60.3639,
        },
        {
          name: "Qarshi",
          nameUz: "Qarshi",
          nameCr: "Қарши",
          nameRu: "Карши",
          apiName: "Karshi",
          latitude: 38.8606,
          longitude: 65.7897,
        },
        {
          name: "Termiz",
          nameUz: "Termiz",
          nameCr: "Термиз",
          nameRu: "Термез",
          apiName: "Termez",
          latitude: 37.2242,
          longitude: 67.2783,
        },
        {
          name: "Jizzax",
          nameUz: "Jizzax",
          nameCr: "Жиззах",
          nameRu: "Джизак",
          apiName: "Jizzakh",
          latitude: 40.1158,
          longitude: 67.8422,
        },
        {
          name: "Guliston",
          nameUz: "Guliston",
          nameCr: "Гулистон",
          nameRu: "Гулистан",
          apiName: "Gulistan",
          latitude: 40.4897,
          longitude: 68.7842,
        },
        {
          name: "Navoiy",
          nameUz: "Navoiy",
          nameCr: "Навоий",
          nameRu: "Навои",
          apiName: "Navoi",
          latitude: 40.0844,
          longitude: 65.3792,
        },
        {
          name: "Qo'qon",
          nameUz: "Qo'qon",
          nameCr: "Қўқон",
          nameRu: "Коканд",
          apiName: "Kokand",
          latitude: 40.5283,
          longitude: 70.9425,
        },
        {
          name: "Marg'ilon",
          nameUz: "Marg'ilon",
          nameCr: "Марғилон",
          nameRu: "Маргилан",
          apiName: "Margilan",
          latitude: 40.4717,
          longitude: 71.7247,
        },
        {
          name: "Angren",
          nameUz: "Angren",
          nameCr: "Ангрен",
          nameRu: "Ангрен",
          apiName: "Angren",
          latitude: 41.0167,
          longitude: 70.1436,
        },
        {
          name: "Bekobod",
          nameUz: "Bekobod",
          nameCr: "Бекобод",
          nameRu: "Бекабад",
          apiName: "Bekabad",
          latitude: 40.2172,
          longitude: 69.1928,
        },
        {
          name: "Chirchiq",
          nameUz: "Chirchiq",
          nameCr: "Чирчиқ",
          nameRu: "Чирчик",
          apiName: "Chirchik",
          latitude: 41.4689,
          longitude: 69.5822,
        },
        {
          name: "Olmaliq",
          nameUz: "Olmaliq",
          nameCr: "Олмалиқ",
          nameRu: "Алмалык",
          apiName: "Almalyk",
          latitude: 40.8444,
          longitude: 69.5989,
        },

        // Qo'shimcha shaharlar
        {
          name: "Oltiariq",
          nameUz: "Oltiariq",
          nameCr: "Олтиариқ",
          nameRu: "Алтиарык",
          apiName: "Oltiariq",
          latitude: 40.3886,
          longitude: 72.2333,
        },
        {
          name: "Rishton",
          nameUz: "Rishton",
          nameCr: "Риштон",
          nameRu: "Риштан",
          apiName: "Rishton",
          latitude: 40.3597,
          longitude: 71.2839,
        },
        {
          name: "Xo'jaobod",
          nameUz: "Xo'jaobod",
          nameCr: "Хўжаобод",
          nameRu: "Ходжаабад",
          apiName: "Khodjaabad",
          latitude: 40.7542,
          longitude: 72.5736,
        },
        {
          name: "Do'stlik",
          nameUz: "Do'stlik",
          nameCr: "Дўстлик",
          nameRu: "Дустлик",
          apiName: "Dustlik",
          latitude: 40.3492,
          longitude: 72.2892,
        },
        {
          name: "Uchqo'rg'on",
          nameUz: "Uchqo'rg'on",
          nameCr: "Учқўрғон",
          nameRu: "Учкурган",
          apiName: "Uchkurgan",
          latitude: 40.4311,
          longitude: 72.9333,
        },
        {
          name: "Pop",
          nameUz: "Pop",
          nameCr: "Поп",
          nameRu: "Папп",
          apiName: "Pop",
          latitude: 40.8764,
          longitude: 71.1139,
        },
        {
          name: "Quva",
          nameUz: "Quva",
          nameCr: "Қува",
          nameRu: "Кува",
          apiName: "Kuva",
          latitude: 40.5239,
          longitude: 72.0506,
        },
        {
          name: "Uchtepa",
          nameUz: "Uchtepa",
          nameCr: "Учтепа",
          nameRu: "Учтепа",
          apiName: "Uchtepa",
          latitude: 41.2858,
          longitude: 69.2014,
        },
        {
          name: "G'uzor",
          nameUz: "G'uzor",
          nameCr: "Ғузор",
          nameRu: "Гузар",
          apiName: "Guzar",
          latitude: 38.6189,
          longitude: 66.2472,
        },
        {
          name: "Qo'rg'ontepa",
          nameUz: "Qo'rg'ontepa",
          nameCr: "Қўрғонтепа",
          nameRu: "Кургантепа",
          apiName: "Kurgantepa",
          latitude: 37.8228,
          longitude: 65.6158,
        },
        {
          name: "Muborak",
          nameUz: "Muborak",
          nameCr: "Муборак",
          nameRu: "Мубарек",
          apiName: "Mubarek",
          latitude: 40.3147,
          longitude: 69.0089,
        },
        {
          name: "Nurota",
          nameUz: "Nurota",
          nameCr: "Нурота",
          nameRu: "Нурата",
          apiName: "Nurata",
          latitude: 40.5614,
          longitude: 65.6875,
        },
        {
          name: "Shumanay",
          nameUz: "Shumanay",
          nameCr: "Шуманай",
          nameRu: "Шуманай",
          apiName: "Shumanay",
          latitude: 42.0097,
          longitude: 59.8958,
        },
        {
          name: "Chimboy",
          nameUz: "Chimboy",
          nameCr: "Чимбой",
          nameRu: "Чимбай",
          apiName: "Chimboy",
          latitude: 42.9464,
          longitude: 59.7867,
        },
        {
          name: "Jomboy",
          nameUz: "Jomboy",
          nameCr: "Жомбой",
          nameRu: "Джамбай",
          apiName: "Jomboy",
          latitude: 39.6986,
          longitude: 67.4414,
        },
        {
          name: "Sherobod",
          nameUz: "Sherobod",
          nameCr: "Шеробод",
          nameRu: "Шерабад",
          apiName: "Sherabad",
          latitude: 37.6742,
          longitude: 67.0158,
        },
        {
          name: "Mo'ynoq",
          nameUz: "Mo'ynoq",
          nameCr: "Мўйноқ",
          nameRu: "Муйнак",
          apiName: "Muynoq",
          latitude: 43.7667,
          longitude: 59.0333,
        },
        {
          name: "Buloqboshi",
          nameUz: "Buloqboshi",
          nameCr: "Булоқбоши",
          nameRu: "Булакбаши",
          apiName: "Bulokboshi",
          latitude: 40.8028,
          longitude: 72.3364,
        },
        {
          name: "Qiziltepa",
          nameUz: "Qiziltepa",
          nameCr: "Қизилтепа",
          nameRu: "Кызылтепа",
          apiName: "Kyzyltepa",
          latitude: 40.0397,
          longitude: 65.1678,
        },
        {
          name: "Zomin",
          nameUz: "Zomin",
          nameCr: "Зомин",
          nameRu: "Зомин",
          apiName: "Zomin",
          latitude: 39.9606,
          longitude: 68.4058,
        },
        {
          name: "Yangibozor",
          nameUz: "Yangibozor",
          nameCr: "Янгибозор",
          nameRu: "Янгибазар",
          apiName: "Yangibazar",
          latitude: 41.1119,
          longitude: 70.0928,
        },
        {
          name: "Chortoq",
          nameUz: "Chortoq",
          nameCr: "Чортоқ",
          nameRu: "Чартак",
          apiName: "Chartak",
          latitude: 41.0447,
          longitude: 71.0758,
        },
        {
          name: "Taxtako'pir",
          nameUz: "Taxtako'pir",
          nameCr: "Тахтакўпир",
          nameRu: "Тахтакупыр",
          apiName: "Takhtakupir",
          latitude: 41.7653,
          longitude: 59.9181,
        },
        {
          name: "Kosonsoy",
          nameUz: "Kosonsoy",
          nameCr: "Косонсой",
          nameRu: "Касансай",
          apiName: "Kasansay",
          latitude: 41.2314,
          longitude: 71.5478,
        },
        {
          name: "Konimex",
          nameUz: "Konimex",
          nameCr: "Конимех",
          nameRu: "Канимех",
          apiName: "Konimeh",
          latitude: 40.5228,
          longitude: 70.6375,
        },
        {
          name: "Mingbuloq",
          nameUz: "Mingbuloq",
          nameCr: "Мингбулоқ",
          nameRu: "Мингбулак",
          apiName: "Mingbulok",
          latitude: 40.4522,
          longitude: 72.4244,
        },
        {
          name: "Paxtaobod",
          nameUz: "Paxtaobod",
          nameCr: "Пахтаобод",
          nameRu: "Пахтаабад",
          apiName: "Paxtaabad",
          latitude: 40.3142,
          longitude: 72.4697,
        },
        {
          name: "Denov",
          nameUz: "Denov",
          nameCr: "Денов",
          nameRu: "Денау",
          apiName: "Denau",
          latitude: 38.2719,
          longitude: 67.8942,
        },
        {
          name: "O'g'iz",
          nameUz: "O'g'iz",
          nameCr: "Ўғиз",
          nameRu: "Угиз",
          apiName: "Ugiz",
          latitude: 40.3333,
          longitude: 68.5167,
        },
        {
          name: "Qo'ng'irot",
          nameUz: "Qo'ng'irot",
          nameCr: "Қўнғирот",
          nameRu: "Кунград",
          apiName: "Kungrad",
          latitude: 43.0731,
          longitude: 58.9128,
        },
        {
          name: "Chust",
          nameUz: "Chust",
          nameCr: "Чуст",
          nameRu: "Чуст",
          apiName: "Chust",
          latitude: 41.0067,
          longitude: 71.2372,
        },
        {
          name: "Kattaqo'rg'on",
          nameUz: "Kattaqo'rg'on",
          nameCr: "Каттақўрғон",
          nameRu: "Каттакурган",
          apiName: "Kattakurgan",
          latitude: 39.8922,
          longitude: 66.2556,
        },
        {
          name: "Qorako'l",
          nameUz: "Qorako'l",
          nameCr: "Қоракўл",
          nameRu: "Каракуль",
          apiName: "Karakul",
          latitude: 39.5286,
          longitude: 63.8547,
        },
        {
          name: "Arnasoy",
          nameUz: "Arnasoy",
          nameCr: "Арнасой",
          nameRu: "Арнасай",
          apiName: "Arnasay",
          latitude: 40.2883,
          longitude: 68.2022,
        },
        {
          name: "Urgut",
          nameUz: "Urgut",
          nameCr: "Ургут",
          nameRu: "Ургут",
          apiName: "Urgut",
          latitude: 39.3997,
          longitude: 67.2581,
        },
        {
          name: "Shahrixon",
          nameUz: "Shahrixon",
          nameCr: "Шахрихон",
          nameRu: "Шахрихан",
          apiName: "Shahrikhan",
          latitude: 40.7203,
          longitude: 72.0397,
        },
        {
          name: "Qumqo'rg'on",
          nameUz: "Qumqo'rg'on",
          nameCr: "Қумқўрғон",
          nameRu: "Кумкурган",
          apiName: "Kumkurgan",
          latitude: 37.8353,
          longitude: 67.5711,
        },
        {
          name: "Boysun",
          nameUz: "Boysun",
          nameCr: "Бойсун",
          nameRu: "Байсун",
          apiName: "Boysun",
          latitude: 38.2044,
          longitude: 67.2067,
        },
        {
          name: "Gazli",
          nameUz: "Gazli",
          nameCr: "Газли",
          nameRu: "Газли",
          apiName: "Gazli",
          latitude: 40.1333,
          longitude: 63.45,
        },
        {
          name: "Xazorasp",
          nameUz: "Xazorasp",
          nameCr: "Хазорасп",
          nameRu: "Хазарасп",
          apiName: "Hazorasp",
          latitude: 41.3194,
          longitude: 61.0722,
        },
        {
          name: "Shovot",
          nameUz: "Shovot",
          nameCr: "Шовот",
          nameRu: "Шават",
          apiName: "Shovot",
          latitude: 41.6325,
          longitude: 60.3053,
        },
        {
          name: "Burchmulla",
          nameUz: "Burchmulla",
          nameCr: "Бурчмулла",
          nameRu: "Бурчмулла",
          apiName: "Burchmulla",
          latitude: 41.0978,
          longitude: 70.3875,
        },
        {
          name: "Dehqonobod",
          nameUz: "Dehqonobod",
          nameCr: "Деҳқонобод",
          nameRu: "Дехканабад",
          apiName: "Dehkanabad",
          latitude: 38.2842,
          longitude: 66.8078,
        },
        {
          name: "Zarafshon",
          nameUz: "Zarafshon",
          nameCr: "Зарафшон",
          nameRu: "Зарафшан",
          apiName: "Zarafshan",
          latitude: 41.5739,
          longitude: 64.2072,
        },
        {
          name: "Koson",
          nameUz: "Koson",
          nameCr: "Косон",
          nameRu: "Касан",
          apiName: "Koson",
          latitude: 39.0333,
          longitude: 65.6167,
        },
        {
          name: "G'allaorol",
          nameUz: "G'allaorol",
          nameCr: "Ғаллаорол",
          nameRu: "Галляарал",
          apiName: "Gallaorol",
          latitude: 40.2897,
          longitude: 68.7078,
        },
        {
          name: "Xonqa",
          nameUz: "Xonqa",
          nameCr: "Хонқа",
          nameRu: "Ханка",
          apiName: "Khanka",
          latitude: 40.3606,
          longitude: 68.1581,
        },
        {
          name: "Tallimarjon",
          nameUz: "Tallimarjon",
          nameCr: "Таллимаржон",
          nameRu: "Таллимарджан",
          apiName: "Tallimarjan",
          latitude: 37.6394,
          longitude: 67.3361,
        },
        {
          name: "Qorovulbozor",
          nameUz: "Qorovulbozor",
          nameCr: "Қоровулбозор",
          nameRu: "Каравулбазар",
          apiName: "Karaulbazar",
          latitude: 39.5106,
          longitude: 63.9681,
        },
        {
          name: "Xonobod",
          nameUz: "Xonobod",
          nameCr: "Хонобод",
          nameRu: "Ханабад",
          apiName: "Khanabad",
          latitude: 40.8333,
          longitude: 72.9167,
        },
        {
          name: "Olot",
          nameUz: "Olot",
          nameCr: "Олот",
          nameRu: "Алат",
          apiName: "Olot",
          latitude: 40.4639,
          longitude: 64.4797,
        },

        // Qo'shni davlatlar shaharlari (taqvim uchun)
        {
          name: "Bishkek",
          nameUz: "Bishkek",
          nameCr: "Бишкек",
          nameRu: "Бишкек",
          apiName: "Bishkek",
          latitude: 42.8746,
          longitude: 74.5698,
          country: "Kyrgyzstan",
        },
        {
          name: "Osh",
          nameUz: "Osh",
          nameCr: "Ош",
          nameRu: "Ош",
          apiName: "Osh",
          latitude: 40.5283,
          longitude: 72.7985,
          country: "Kyrgyzstan",
        },
        {
          name: "Jalolobod",
          nameUz: "Jalolobod",
          nameCr: "Жалолобод",
          nameRu: "Джалал-Абад",
          apiName: "Jalal-Abad",
          latitude: 40.9333,
          longitude: 72.9667,
          country: "Kyrgyzstan",
        },
        {
          name: "Dushanbe",
          nameUz: "Dushanbe",
          nameCr: "Душанбе",
          nameRu: "Душанбе",
          apiName: "Dushanbe",
          latitude: 38.5598,
          longitude: 68.7738,
          country: "Tajikistan",
        },
        {
          name: "Xo'jand",
          nameUz: "Xo'jand",
          nameCr: "Хўжанд",
          nameRu: "Худжанд",
          apiName: "Khujand",
          latitude: 40.2828,
          longitude: 69.6228,
          country: "Tajikistan",
        },
        {
          name: "Konibodom",
          nameUz: "Konibodom",
          nameCr: "Конибодом",
          nameRu: "Канибадам",
          apiName: "Kanibadam",
          latitude: 40.2972,
          longitude: 70.4272,
          country: "Tajikistan",
        },
        {
          name: "Ashxabod",
          nameUz: "Ashxabod",
          nameCr: "Ашхабод",
          nameRu: "Ашхабад",
          apiName: "Ashgabat",
          latitude: 37.9601,
          longitude: 58.3261,
          country: "Turkmenistan",
        },
        {
          name: "Turkmanobod",
          nameUz: "Turkmanobod",
          nameCr: "Туркманобод",
          nameRu: "Туркменабад",
          apiName: "Turkmenabat",
          latitude: 39.0936,
          longitude: 63.5784,
          country: "Turkmenistan",
        },
        {
          name: "Toshhovuz",
          nameUz: "Toshhovuz",
          nameCr: "Тошховуз",
          nameRu: "Дашховуз",
          apiName: "Dashoguz",
          latitude: 41.8347,
          longitude: 59.9658,
          country: "Turkmenistan",
        },
        {
          name: "Chimkent",
          nameUz: "Chimkent",
          nameCr: "Чимкент",
          nameRu: "Шымкент",
          apiName: "Shymkent",
          latitude: 42.3153,
          longitude: 69.5992,
          country: "Kazakhstan",
        },
        {
          name: "Turkiston",
          nameUz: "Turkiston",
          nameCr: "Туркистон",
          nameRu: "Туркестан",
          apiName: "Turkestan",
          latitude: 43.2972,
          longitude: 68.2514,
          country: "Kazakhstan",
        },
        {
          name: "Sayram",
          nameUz: "Sayram",
          nameCr: "Сайрам",
          nameRu: "Сайрам",
          apiName: "Sayram",
          latitude: 42.3033,
          longitude: 69.7658,
          country: "Kazakhstan",
        },
        {
          name: "Jambul",
          nameUz: "Jambul",
          nameCr: "Жамбул",
          nameRu: "Тараз",
          apiName: "Taraz",
          latitude: 42.9,
          longitude: 71.3667,
          country: "Kazakhstan",
        },
        {
          name: "Olmaota",
          nameUz: "Olmaota",
          nameCr: "Олмаота",
          nameRu: "Алматы",
          apiName: "Almaty",
          latitude: 43.222,
          longitude: 76.8512,
          country: "Kazakhstan",
        },
        {
          name: "Samarqand",
          nameUz: "Samarqand",
          nameCr: "Самарқанд",
          nameRu: "Самарканд",
          apiName: "Samarkand",
          latitude: 39.627,
          longitude: 66.975,
        },
        {
          name: "Buxoro",
          nameUz: "Buxoro",
          nameCr: "Бухоро",
          nameRu: "Бухара",
          apiName: "Bukhara",
          latitude: 39.7747,
          longitude: 64.4286,
        },
        {
          name: "Andijon",
          nameUz: "Andijon",
          nameCr: "Андижон",
          nameRu: "Андижан",
          latitude: 40.7821,
          longitude: 72.3442,
        },
        {
          name: "Namangan",
          nameUz: "Namangan",
          nameCr: "Наманган",
          nameRu: "Наманган",
          latitude: 40.9983,
          longitude: 71.6726,
        },
        {
          name: "Farg'ona",
          nameUz: "Farg'ona",
          nameCr: "Фарғона",
          nameRu: "Фергана",
          latitude: 40.3864,
          longitude: 71.7864,
        },
        {
          name: "Nukus",
          nameUz: "Nukus",
          nameCr: "Нукус",
          nameRu: "Нукус",
          latitude: 42.4531,
          longitude: 59.6103,
        },
        {
          name: "Urganch",
          nameUz: "Urganch",
          nameCr: "Урганч",
          nameRu: "Ургенч",
          latitude: 41.55,
          longitude: 60.6333,
        },
        {
          name: "Xiva",
          nameUz: "Xiva",
          nameCr: "Хива",
          nameRu: "Хива",
          latitude: 41.3781,
          longitude: 60.3639,
        },
        {
          name: "Qarshi",
          nameUz: "Qarshi",
          nameCr: "Қарши",
          nameRu: "Карши",
          latitude: 38.8606,
          longitude: 65.7897,
        },
        {
          name: "Termiz",
          nameUz: "Termiz",
          nameCr: "Термиз",
          nameRu: "Термез",
          latitude: 37.2242,
          longitude: 67.2783,
        },
        {
          name: "Jizzax",
          nameUz: "Jizzax",
          nameCr: "Жиззах",
          nameRu: "Джизак",
          latitude: 40.1158,
          longitude: 67.8422,
        },
        {
          name: "Guliston",
          nameUz: "Guliston",
          nameCr: "Гулистон",
          nameRu: "Гулистан",
          latitude: 40.4897,
          longitude: 68.7842,
        },
        {
          name: "Navoiy",
          nameUz: "Navoiy",
          nameCr: "Навоий",
          nameRu: "Навои",
          latitude: 40.0844,
          longitude: 65.3792,
        },
        {
          name: "Qo'qon",
          nameUz: "Qo'qon",
          nameCr: "Қўқон",
          nameRu: "Коканд",
          latitude: 40.5283,
          longitude: 70.9425,
        },
        {
          name: "Marg'ilon",
          nameUz: "Marg'ilon",
          nameCr: "Марғилон",
          nameRu: "Маргилан",
          latitude: 40.4717,
          longitude: 71.7247,
        },
        {
          name: "Angren",
          nameUz: "Angren",
          nameCr: "Ангрен",
          nameRu: "Ангрен",
          latitude: 41.0167,
          longitude: 70.1436,
        },
        {
          name: "Chirchiq",
          nameUz: "Chirchiq",
          nameCr: "Чирчиқ",
          nameRu: "Чирчик",
          latitude: 41.4689,
          longitude: 69.5822,
        },
        {
          name: "Bekobod",
          nameUz: "Bekobod",
          nameCr: "Бекобод",
          nameRu: "Бекабад",
          latitude: 40.2172,
          longitude: 69.1928,
        },
        {
          name: "Olmaliq",
          nameUz: "Olmaliq",
          nameCr: "Олмалиқ",
          nameRu: "Алмалык",
          latitude: 40.8444,
          longitude: 69.5989,
        },
      ];

      await Location.insertMany(defaultCities);
      console.log(
        "✅ Default locations initialized:",
        defaultCities.length,
        "cities"
      );
    } else {
      console.log("✅ Locations already exist:", count, "cities");
    }
  } catch (error) {
    console.error("❌ Error initializing default locations:", error.message);
    // Xatolik bo'lsa ham bot davom etsin
    return false;
  }
  return true;
}

module.exports = {
  calculateDistance,
  findNearestCity,
  getAllLocations,
  addLocation,
  initializeDefaultLocations,
};
