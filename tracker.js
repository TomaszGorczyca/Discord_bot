const fs = require("fs");
const path = require("path");

const GRAIDS_FILE = path.join(__dirname, "graids.json");
const STWEEKLY_FILE = path.join(__dirname, "stweekly.json");
const TOME_WINNERS_FILE = path.join(__dirname, "tomeWinners.json");
const PROMOTIONS_FILE = path.join(__dirname, "promotions.json");
const DEMOTIONS_FILE = path.join(__dirname, "demotion.json");

const RANK_NAMES = {
  recruit: "Recruit",
  recruiter: "Recruiter",
  captain: "Captain",
  strategist: "Strategist",
  chief: "Chief"
};

const RANK_LEVELS = {
  recruit: 0,
  recruiter: 1,
  captain: 2,
  strategist: 3,
  chief: 4
};


// =====================================================
// GENERIC FILE HELPERS
// =====================================================

function loadJsonFile(file, fallback) {

  if (!fs.existsSync(file)) {
    return fallback;
  }

  try {

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );

  } catch (err) {

    console.error(
      `Error reading ${path.basename(file)}:`,
      err
    );

    return fallback;
  }
}


function saveJsonFile(file, data) {

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );

}


// =====================================================
// DUBLIN DATE / WEEK
// =====================================================

function getDublinDate() {

  return new Date(
    new Date().toLocaleString(
      "en-IE",
      {
        timeZone: "Europe/Dublin"
      }
    )
  );
}


function getCurrentWeekKey() {

  const date =
    getDublinDate();

  const day =
    date.getDay();

  const daysSinceMonday =
    day === 0
      ? 6
      : day - 1;

  date.setDate(
    date.getDate() -
    daysSinceMonday
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const dayOfMonth =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}


// =====================================================
// GRAIDS
// =====================================================

function loadGraidData() {

  return loadJsonFile(
    GRAIDS_FILE,
    {}
  );
}


function saveGraidData(data) {

  saveJsonFile(
    GRAIDS_FILE,
    data
  );
}


function checkGraids(guild) {

  const oldData =
    loadGraidData();

  const newData = {};

  const completedRecently = [];

  const isFirstRun =
    Object.keys(oldData).length === 0;


  for (const rank in guild.members) {

    if (rank === "total") {
      continue;
    }

    const members =
      guild.members[rank];


    for (const name in members) {

      const player =
        members[name];

      const currentTotal =
        player.globalData
          ?.currentGuildRaids
          ?.total ?? 0;


      newData[name] =
        currentTotal;


      if (
        oldData[name] === undefined
      ) {
        continue;
      }


      const difference =
        currentTotal -
        oldData[name];


      if (difference > 0) {

        completedRecently.push({
          name: name,
          amount: difference
        });

      }

    }

  }


  saveGraidData(
    newData
  );


  return {

    completedRecently,

    isFirstRun,

    totalMembers:
      Object.keys(newData).length

  };
}


// =====================================================
// ST WEEKLY
// =====================================================

function loadSTWeeklyData() {

  return loadJsonFile(
    STWEEKLY_FILE,
    null
  );
}


function saveSTWeeklyData(data) {

  saveJsonFile(
    STWEEKLY_FILE,
    data
  );
}


function collectCurrentStreaks(guild) {

  const currentData = {};


  for (const rank in guild.members) {

    if (rank === "total") {
      continue;
    }


    const members =
      guild.members[rank];


    for (const name in members) {

      const player =
        members[name];

      const streak =
        player.weekly?.streak;


      if (
        typeof streak !== "number"
      ) {
        continue;
      }


      currentData[name] =
        streak;

    }

  }


  return currentData;
}


function checkSTWeekly(guild) {

  const savedData =
    loadSTWeeklyData();

  const currentData =
    collectCurrentStreaks(guild);


  // First run

  if (!savedData) {

    const firstData = {

      lastUpdate:
        new Date().toISOString(),

      members:
        currentData

    };


    saveSTWeeklyData(
      firstData
    );


    return {

      initialized: true,

      completed: [],

      baselineUpdated: false,

      totalMembers:
        Object.keys(currentData).length,

      lastUpdate:
        firstData.lastUpdate

    };

  }


  // Compare against baseline

  const completed = [];


  for (const name in currentData) {

    if (
      savedData.members[name] === undefined
    ) {
      continue;
    }


    const difference =
      currentData[name] -
      savedData.members[name];


    if (difference > 0) {

      completed.push({

        name: name,

        amount:
          difference

      });

    }

  }


  const dublinDate =
    getDublinDate();


  const lastUpdate =
    new Date(
      savedData.lastUpdate
    );


  const lastUpdateDublin =
    new Date(
      lastUpdate.toLocaleString(
        "en-IE",
        {
          timeZone:
            "Europe/Dublin"
        }
      )
    );


  const isMonday =
    dublinDate.getDay() === 1;


  const isAfterFourFiftyFive =
    dublinDate.getHours() > 4 ||
    (
      dublinDate.getHours() === 4 &&
      dublinDate.getMinutes() >= 55
    );


  const alreadyUpdatedToday =
    lastUpdateDublin.getFullYear() ===
      dublinDate.getFullYear() &&

    lastUpdateDublin.getMonth() ===
      dublinDate.getMonth() &&

    lastUpdateDublin.getDate() ===
      dublinDate.getDate();


  let baselineUpdated =
    false;

  let lastUpdateValue =
    savedData.lastUpdate;


  if (
    isMonday &&
    isAfterFourFiftyFive &&
    !alreadyUpdatedToday
  ) {

    const newData = {

      lastUpdate:
        new Date().toISOString(),

      members:
        currentData

    };


    saveSTWeeklyData(
      newData
    );


    baselineUpdated =
      true;

    lastUpdateValue =
      newData.lastUpdate;

  }


  return {

    initialized: false,

    completed,

    baselineUpdated,

    totalMembers:
      Object.keys(currentData).length,

    lastUpdate:
      lastUpdateValue

  };
}


// =====================================================
// RANK HELPERS
// =====================================================

function normalizeRank(rank) {

  if (!rank) {
    return null;
  }


  const value =
    String(rank)
      .toLowerCase()
      .trim();


  if (
    value === "guild member" ||
    value === "member"
  ) {

    return "recruit";

  }


  if (
    value === "strategy" ||
    value === "strategies"
  ) {

    return "strategist";

  }


  if (
    RANK_NAMES[value]
  ) {

    return value;

  }


  return null;
}


function getRankName(rank) {

  const normalized =
    normalizeRank(rank);


  if (
    normalized
  ) {

    return RANK_NAMES[
      normalized
    ];

  }


  return "Unknown";
}


function getGuildMembers(guild) {

  const members = {};


  for (const rank in guild.members) {

    if (rank === "total") {
      continue;
    }


    for (
      const name in guild.members[rank]
    ) {

      members[name] = {

        name: name,

        rank:
          normalizeRank(rank) ||
          String(rank).toLowerCase(),

        player:
          guild.members[rank][name]

      };

    }

  }


  return members;
}


function findGuildMember(
  guild,
  requestedName
) {

  const members =
    getGuildMembers(guild);


  const wanted =
    String(requestedName)
      .toLowerCase()
      .trim();


  for (const name in members) {

    if (
      name.toLowerCase() ===
      wanted
    ) {

      return members[name];

    }

  }


  return null;
}


function getPreviousRank(rank) {

  const level =
    RANK_LEVELS[rank];


  if (
    level === undefined ||
    level <= 0
  ) {

    return null;

  }


  return Object.keys(
    RANK_LEVELS
  ).find(
    value =>
      RANK_LEVELS[value] ===
      level - 1
  );
}


// =====================================================
// PROMOTION FILE
// =====================================================

function loadPromotions() {

  const currentWeek =
    getCurrentWeekKey();


  const data =
    loadJsonFile(
      PROMOTIONS_FILE,
      {
        week:
          currentWeek,

        entries: []
      }
    );


  if (
    data.week !==
    currentWeek
  ) {

    return {

      week:
        currentWeek,

      entries: []

    };

  }


  if (
    !Array.isArray(
      data.entries
    )
  ) {

    data.entries = [];

  }


  return data;
}


function savePromotions(data) {

  saveJsonFile(
    PROMOTIONS_FILE,
    data
  );
}


// =====================================================
// DEMOTION FILE
// =====================================================

function loadDemotions() {

  const data =
    loadJsonFile(
      DEMOTIONS_FILE,
      {

        lastProcessedWeek:
          null,

        members: {},

        automatic: [],

        manual: []

      }
    );


  if (
    !data.members ||
    typeof data.members !== "object"
  ) {

    data.members = {};

  }


  if (
    !Array.isArray(
      data.automatic
    )
  ) {

    data.automatic = [];

  }


  if (
    !Array.isArray(
      data.manual
    )
  ) {

    data.manual = [];

  }


  return data;
}


function saveDemotions(data) {

  saveJsonFile(
    DEMOTIONS_FILE,
    data
  );
}


// =====================================================
// AUTOMATIC PROMOTIONS
// =====================================================

function getAutomaticPromotions(guild) {

  const promotions = [];

  const members =
    getGuildMembers(guild);


  for (const name in members) {

    const member =
      members[name];


    const streak =
      member.player
        .weekly
        ?.streak;


    if (
      typeof streak !==
      "number"
    ) {

      continue;

    }


    // Recruit -> Recruiter

    if (
      member.rank === "recruit" &&
      streak >= 3
    ) {

      promotions.push({

        name: name,

        from: "recruit",

        to: "recruiter",

        streak: streak,

        type: "automatic"

      });

    }


    // Recruiter -> Captain

    if (
      member.rank === "recruiter" &&
      streak >= 7
    ) {

      promotions.push({

        name: name,

        from: "recruiter",

        to: "captain",

        streak: streak,

        type: "automatic"

      });

    }

  }


  return promotions;
}


// =====================================================
// WEEKLY DEMOTION PROCESSING
// =====================================================

function processWeeklyDemotions(guild) {

  const data =
    loadDemotions();


  const currentWeek =
    getCurrentWeekKey();


  // Do not process the same week twice.

  if (
    data.lastProcessedWeek ===
    currentWeek
  ) {

    return data.automatic || [];

  }


  const currentMembers =
    getGuildMembers(guild);


  const previousMembers =
    data.members || {};


  const newMembers = {};

  const automatic = [];


  for (
    const name in currentMembers
  ) {

    const member =
      currentMembers[name];


    const streak =
      member.player
        .weekly
        ?.streak;


    if (
      typeof streak !==
      "number"
    ) {

      continue;

    }


    const previous =
      previousMembers[name];


    // New member

    if (!previous) {

      newMembers[name] = {

        streak: streak,

        inactiveWeeks: 0,

        rank:
          member.rank

      };


      continue;

    }


    const completed =
      member.player
        .weekly
        ?.completed === true;


    let inactiveWeeks;


    if (completed) {

      inactiveWeeks = 0;

    } else {

      inactiveWeeks =
        (
          previous.inactiveWeeks ||
          0
        ) + 1;

    }


    newMembers[name] = {

      streak: streak,

      inactiveWeeks:
        inactiveWeeks,

      rank:
        member.rank

    };


    // Two inactive weeks

    if (
      inactiveWeeks >= 2 &&
      member.rank !== "recruit"
    ) {

      const to =
        getPreviousRank(
          member.rank
        );


      if (to) {

        automatic.push({

          name: name,

          from:
            member.rank,

          to: to,

          streak:
            streak,

          inactiveWeeks:
            inactiveWeeks,

          type:
            "automatic"

        });

      }


      // Prevent the same demotion from appearing
      // every time the report is opened.

      newMembers[name]
        .inactiveWeeks = 0;

    }

  }


  data.lastProcessedWeek =
    currentWeek;

  data.members =
    newMembers;

  data.automatic =
    automatic;


  saveDemotions(
    data
  );


  return automatic;
}


function getAutomaticDemotions(guild) {

  const data =
    loadDemotions();


  const currentWeek =
    getCurrentWeekKey();


  if (
    data.lastProcessedWeek !==
    currentWeek
  ) {

    return processWeeklyDemotions(
      guild
    );

  }


  return data.automatic || [];
}


// =====================================================
// MANUAL PROMOTION
// =====================================================

function addManualPromotion(
  guild,
  requestedName,
  targetRank
) {

  const member =
    findGuildMember(
      guild,
      requestedName
    );


  const normalizedTarget =
    normalizeRank(
      targetRank
    );


  if (!member) {

    return {

      success: false,

      error:
        "Member not found."

    };

  }


  if (!normalizedTarget) {

    return {

      success: false,

      error:
        "Invalid target rank."

    };

  }


  const currentLevel =
    RANK_LEVELS[
      member.rank
    ];


  const targetLevel =
    RANK_LEVELS[
      normalizedTarget
    ];


  if (
    currentLevel === undefined ||
    targetLevel === undefined
  ) {

    return {

      success: false,

      error:
        "Member rank could not be determined."

    };

  }


  if (
    targetLevel <=
    currentLevel
  ) {

    return {

      success: false,

      error:
        `${member.name} is already ${getRankName(member.rank)} or higher.`

    };

  }


  const data =
    loadPromotions();


  data.entries =
    data.entries.filter(
      entry =>
        entry.name !==
        member.name
    );


  data.entries.push({

    name:
      member.name,

    from:
      member.rank,

    to:
      normalizedTarget,

    type:
      "manual",

    addedAt:
      new Date().toISOString()

  });


  savePromotions(
    data
  );


  return {

    success: true,

    name:
      member.name,

    from:
      member.rank,

    to:
      normalizedTarget

  };
}


// =====================================================
// MANUAL DEMOTION
// =====================================================

function addManualDemotion(
  guild,
  requestedName,
  targetRank
) {

  const member =
    findGuildMember(
      guild,
      requestedName
    );


  const normalizedTarget =
    normalizeRank(
      targetRank
    );


  if (!member) {

    return {

      success: false,

      error:
        "Member not found."

    };

  }


  if (!normalizedTarget) {

    return {

      success: false,

      error:
        "Invalid target rank."

    };

  }


  const currentLevel =
    RANK_LEVELS[
      member.rank
    ];


  const targetLevel =
    RANK_LEVELS[
      normalizedTarget
    ];


  if (
    currentLevel === undefined ||
    targetLevel === undefined
  ) {

    return {

      success: false,

      error:
        "Member rank could not be determined."

    };

  }


  if (
    targetLevel >=
    currentLevel
  ) {

    return {

      success: false,

      error:
        `${member.name} is already ${getRankName(member.rank)} or lower.`

    };

  }


  const data =
    loadDemotions();


  data.manual =
    data.manual.filter(
      entry =>
        entry.name !==
        member.name
    );


  data.manual.push({

    name:
      member.name,

    from:
      member.rank,

    to:
      normalizedTarget,

    type:
      "manual",

    addedAt:
      new Date().toISOString()

  });


  saveDemotions(
    data
  );


  return {

    success: true,

    name:
      member.name,

    from:
      member.rank,

    to:
      normalizedTarget

  };
}


// =====================================================
// PROMOTION / DEMOTION PREVIEW
// =====================================================

function getPromotionPreview(guild) {

  const promotionData =
    loadPromotions();


  const demotionData =
    loadDemotions();


  const automaticPromotions =
    getAutomaticPromotions(
      guild
    );


  const automaticDemotions =
    getAutomaticDemotions(
      guild
    );


  const manualPromotionNames =
    new Set(
      promotionData.entries.map(
        entry => entry.name
      )
    );


  const manualDemotionNames =
    new Set(
      demotionData.manual.map(
        entry => entry.name
      )
    );


  return {

    promotions:
      automaticPromotions.filter(
        entry =>
          !manualPromotionNames.has(
            entry.name
          )
      ),

    demotions:
      automaticDemotions.filter(
        entry =>
          !manualDemotionNames.has(
            entry.name
          )
      ),

    manualPromotions:
      promotionData.entries,

    manualDemotions:
      demotionData.manual

  };
}


// =====================================================
// TOME WINNERS
// =====================================================

function loadTomeWinners() {

  return loadJsonFile(
    TOME_WINNERS_FILE,
    null
  );
}


function saveTomeWinners(data) {

  saveJsonFile(
    TOME_WINNERS_FILE,
    data
  );
}


function pickTomeWinners(guild) {

  const existing =
    loadTomeWinners();


  // Only use winners from this week.

  if (
    existing &&
    existing.week ===
      getCurrentWeekKey() &&
    Array.isArray(
      existing.winners
    ) &&
    existing.winners.length === 14
  ) {

    return {

      alreadyPicked: true,

      winners:
        existing.winners,

      lastUpdate:
        existing.lastUpdate

    };

  }


  const eligiblePlayers = [];


  for (
    const rank in guild.members
  ) {

    if (
      rank === "total"
    ) {

      continue;

    }


    const members =
      guild.members[rank];


    for (
      const name in members
    ) {

      const player =
        members[name];


      if (
        player.weekly
          ?.completed === true
      ) {

        eligiblePlayers.push(
          name
        );

      }

    }

  }


  if (
    eligiblePlayers.length < 14
  ) {

    return {

      alreadyPicked: false,

      notEnoughPlayers: true,

      eligibleCount:
        eligiblePlayers.length,

      winners: []

    };

  }


  const shuffled =
    [...eligiblePlayers];


  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      shuffled[i],
      shuffled[j]
    ] =
    [
      shuffled[j],
      shuffled[i]
    ];

  }


  const winners =
    shuffled.slice(
      0,
      14
    );


  const data = {

    week:
      getCurrentWeekKey(),

    lastUpdate:
      new Date().toISOString(),

    winners:
      winners

  };


  saveTomeWinners(
    data
  );


  return {

    alreadyPicked: false,

    notEnoughPlayers: false,

    winners:
      winners,

    lastUpdate:
      data.lastUpdate

  };
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

  checkGraids,

  checkSTWeekly,

  pickTomeWinners,

  loadTomeWinners,

  getPromotionPreview,

  addManualPromotion,

  addManualDemotion,

  getAutomaticPromotions,

  getAutomaticDemotions,

  processWeeklyDemotions,

  loadPromotions,

  loadDemotions,

  getRankName,

  getCurrentWeekKey

};