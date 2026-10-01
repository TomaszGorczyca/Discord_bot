require("dotenv").config();

const axios = require("axios");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const {

  checkGraids,

  checkSTWeekly,

  pickTomeWinners,

  loadTomeWinners,

  getPromotionPreview,

  addManualPromotion,

  addManualDemotion,

  getRankName,

  processWeeklyDemotions,

  getCurrentWeekKey

} = require("./tracker");


const client =
  new Client({

    intents:
      [GatewayIntentBits.Guilds]

  });


const WYNNCRAFT_URL =
  "https://api.wynncraft.com/v3/guild/prefix/TDbD";


const REPORT_CHANNEL_ID =
  process.env.REPORT_CHANNEL_ID;


// Prevent the automatic jobs from
// running twice during the same week.

let lastAutomaticTomeDraw =
  null;

let lastAutomaticSTReset =
  null;

let lastAutomaticPreview =
  null;

let lastAutomaticReport =
  null;


// =====================================================
// FETCH WYNNCRAFT GUILD
// =====================================================

async function fetchGuild() {

  const response =
    await axios.get(
      WYNNCRAFT_URL,
      {

        headers: {

          Authorization:
            `Bearer ${process.env.TOKEN}`

        }

      }
    );


  return response.data;
}


// =====================================================
// REPORT HELPERS
// =====================================================

function formatChange(item) {

  return (
    `${item.name}: ` +
    `${getRankName(item.from)} -> ` +
    `${getRankName(item.to)}`
  );

}


function formatPromotionSection(
  preview
) {

  const automatic =
    preview.promotions.map(
      formatChange
    );


  const manual =
    preview.manualPromotions.map(
      formatChange
    );


  const lines = [

    ...automatic,

    ...manual

  ];


  return lines.length > 0

    ? lines.join("\n")

    : "None";

}


function formatDemotionSection(
  preview
) {

  const automatic =
    preview.demotions.map(
      formatChange
    );


  const manual =
    preview.manualDemotions.map(
      formatChange
    );


  const lines = [

    ...automatic,

    ...manual

  ];


  return lines.length > 0

    ? lines.join("\n")

    : "None";

}


// =====================================================
// GET REPORT CHANNEL
// =====================================================

async function getReportChannel() {

  if (
    !REPORT_CHANNEL_ID
  ) {

    throw new Error(
      "REPORT_CHANNEL_ID is not set in .env"
    );

  }


  const channel =
    await client.channels.fetch(
      REPORT_CHANNEL_ID
    );


  if (
    !channel ||
    !channel.isTextBased()
  ) {

    throw new Error(
      "REPORT_CHANNEL_ID is not a text channel."
    );

  }


  return channel;
}


// =====================================================
// BUILD PREVIEW
// =====================================================

function buildPreviewEmbeds(
  preview
) {

  const promotions =
    formatPromotionSection(
      preview
    );


  const demotions =
    formatDemotionSection(
      preview
    );


  return [

    new EmbedBuilder()

      .setTitle(
        "Promotions"
      )

      .setDescription(
        promotions
      ),


    new EmbedBuilder()

      .setTitle(
        "Demotions"
      )

      .setDescription(
        demotions
      )

  ];

}


// =====================================================
// BUILD FULL REPORT
// =====================================================

function buildFullReportEmbeds(
  preview,
  tomeData
) {

  const embeds = [];


  // ---------------------------------------------------
  // SECTION 1
  // ---------------------------------------------------

  const promotions =
    formatPromotionSection(
      preview
    );


  const demotions =
    formatDemotionSection(
      preview
    );


  embeds.push(

    new EmbedBuilder()

      .setTitle(
        "1. Promotions and Demotions"
      )

      .addFields(

        {

          name:
            "Promotions",

          value:
            promotions.slice(
              0,
              1024
            )

        },

        {

          name:
            "Demotions",

          value:
            demotions.slice(
              0,
              1024
            )

        }

      )

  );


  // ---------------------------------------------------
  // SECTION 2
  // ---------------------------------------------------

  embeds.push(

    new EmbedBuilder()

      .setTitle(
        "2. How to Get Promoted"
      )

      .setDescription(

        "Recruit with a weekly streak of 3 or more " +
        "is automatically recommended for Recruiter.\n\n" +

        "Recruiter with a weekly streak of 7 or more " +
        "is automatically recommended for Captain.\n\n" +

        "Captain to Strategist and Strategist to Chief " +
        "are decided manually."

      )

  );


  // ---------------------------------------------------
  // SECTION 3
  // ---------------------------------------------------

  const winners =
    tomeData?.winners || [];


  const winnerText =
    winners.length > 0

      ? winners
          .map(
            (name, index) =>
              `${index + 1}. ${name}`
          )
          .join("\n")

      : "No winners have been selected yet.";


  embeds.push(

    new EmbedBuilder()

      .setTitle(
        "3. Guild Tome Winners"
      )

      .setDescription(
        winnerText
      )

  );


  // ---------------------------------------------------
  // SECTION 4
  // ---------------------------------------------------

  embeds.push(

    new EmbedBuilder()

      .setTitle(
        "4. How to Learn Guild Tomes"
      )

      .setDescription(

        "Complete your weekly guild objective " +
        "to be eligible for the weekly Guild Tome draw.\n\n" +

        "The weekly draw selects 14 eligible members.\n\n" +

        "The winners are selected automatically " +
        "on Monday at 4:50 AM Ireland time."

      )

  );


  return embeds;
}


// =====================================================
// SEND AUTOMATIC PREVIEW
// =====================================================

async function sendPreviewReport() {

  const guild =
    await fetchGuild();


  processWeeklyDemotions(
    guild
  );


  const preview =
    getPromotionPreview(
      guild
    );


  const channel =
    await getReportChannel();


  const embeds =
    buildPreviewEmbeds(
      preview
    );


  await channel.send({

    content:
      "Weekly promotion and demotion preview",

    embeds:
      embeds

  });

}


// =====================================================
// SEND FULL REPORT
// =====================================================

async function sendFullReport() {

  const guild =
    await fetchGuild();


  const preview =
    getPromotionPreview(
      guild
    );


  const tomeData =
    loadTomeWinners();


  const channel =
    await getReportChannel();


  const embeds =
    buildFullReportEmbeds(
      preview,
      tomeData
    );


  await channel.send({

    content:
      "Weekly Guild Report",

    embeds:
      embeds

  });

}


// =====================================================
// BOT READY
// =====================================================

client.once(
  "clientReady",
  () => {

    console.log(
      `Logged in as ${client.user.tag}`
    );


    console.log(
      "Tome draw: Monday 4:50 AM Ireland time."
    );


    console.log(
      "ST Weekly reset: Monday 4:55 AM Ireland time."
    );


    console.log(
      "Promotion/demotion preview: Monday 5:20 AM Ireland time."
    );


    console.log(
      "Full report: Monday 8:00 PM Ireland time."
    );

  }
);


// =====================================================
// COMMAND HANDLER
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    if (
      !interaction.isChatInputCommand()
    ) {

      return;

    }


    // =================================================
    // /weekly
    // =================================================

    if (
      interaction.commandName ===
      "weekly"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        const completed = [];


        for (
          const rank in guild.members
        ) {

          if (
            rank === "total"
          ) {

            continue;

          }


          for (
            const name in
            guild.members[rank]
          ) {

            const player =
              guild.members[
                rank
              ][name];


            if (
              player.weekly
                ?.completed === true
            ) {

              completed.push(
                name
              );

            }

          }

        }


        const list =
          completed.length > 0

            ? completed.join("\n")

            : "No weekly completions found.";


        await interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                "Weekly Guild Report"
              )

              .addFields(

                {

                  name:
                    "Completed Weekly",

                  value:
                    String(
                      completed.length
                    ),

                  inline:
                    true

                },

                {

                  name:
                    "Players",

                  value:
                    list.slice(
                      0,
                      1024
                    )

                }

              )

          ]

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error fetching weekly data."
        );

      }


      return;
    }


    // =================================================
    // /inactive
    // =================================================

    if (
      interaction.commandName ===
      "inactive"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        const inactivePlayers = [];


        const now =
          new Date();


        for (
          const rank in guild.members
        ) {

          if (
            rank === "total"
          ) {

            continue;

          }


          for (
            const name in
            guild.members[rank]
          ) {

            const player =
              guild.members[
                rank
              ][name];


            if (
              !player.lastJoin
            ) {

              continue;

            }


            const lastJoin =
              new Date(
                player.lastJoin
              );


            const diffDays =
              Math.floor(

                (
                  now -
                  lastJoin
                ) /

                (
                  1000 *
                  60 *
                  60 *
                  24
                )

              );


            if (
              diffDays >= 14
            ) {

              inactivePlayers.push({

                name:
                  name,

                days:
                  diffDays

              });

            }

          }

        }


        inactivePlayers.sort(
          (a, b) =>
            b.days -
            a.days
        );


        const list =
          inactivePlayers.length > 0

            ? inactivePlayers
                .map(
                  player =>
                    `${player.name} -> ${player.days} days`
                )
                .join("\n")

            : "No members inactive for 2 or more weeks.";


        await interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                "Inactive Members"
              )

              .setDescription(
                list.slice(
                  0,
                  4096
                )
              )

          ]

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error fetching inactivity data."
        );

      }


      return;
    }


    // =================================================
    // /graids
    // =================================================

    if (
      interaction.commandName ===
      "graids"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        const result =
          checkGraids(
            guild
          );


        if (
          result.isFirstRun
        ) {

          await interaction.editReply(

            "Graid tracking has been initialized. " +
            "Run /graids again after members complete Graids."

          );

          return;

        }


        if (
          result.completedRecently.length === 0
        ) {

          await interaction.editReply(

            `No recent Graid completions found. ` +
            `${result.totalMembers} guild members are tracked.`

          );

          return;

        }


        const list =
          result.completedRecently

            .map(
              player =>
                `${player.name} -> +${player.amount}`
            )

            .join("\n");


        await interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                "Graid Report"
              )

              .setDescription(
                list.slice(
                  0,
                  4096
                )
              )

          ]

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error fetching Graid data."
        );

      }


      return;
    }


    // =================================================
    // /stweekly
    // =================================================

    if (
      interaction.commandName ===
      "stweekly"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        const result =
          checkSTWeekly(
            guild
          );


        if (
          result.initialized
        ) {

          await interaction.editReply(

            `ST Weekly tracking initialized. ` +
            `${result.totalMembers} members are tracked. ` +
            `The baseline updates automatically every Monday at 4:55 AM Ireland time.`

          );

          return;

        }


        const list =
          result.completed.length > 0

            ? result.completed

                .map(
                  player =>
                    `${player.name} -> +${player.amount}`
                )

                .join("\n")

            : "No streak increases found.";


        await interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                "ST Weekly Report"
              )

              .addFields(

                {

                  name:
                    "Streak increases",

                  value:
                    list.slice(
                      0,
                      1024
                    )

                },

                {

                  name:
                    "Tracked members",

                  value:
                    String(
                      result.totalMembers
                    ),

                  inline:
                    true

                },

                {

                  name:
                    "Baseline",

                  value:
                    result.baselineUpdated
                      ? "Updated"
                      : "Not updated",

                  inline:
                    true

                }

              )

          ]

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error fetching ST Weekly data."
        );

      }


      return;
    }


    // =================================================
    // /tomewinners
    // =================================================

    if (
      interaction.commandName ===
      "tomewinners"
    ) {

      await interaction.deferReply();


      try {

        const data =
          loadTomeWinners();


        if (
          !data ||
          !Array.isArray(
            data.winners
          ) ||
          data.winners.length === 0
        ) {

          await interaction.editReply(

            "The winners have not been selected yet. " +
            "The automatic draw runs Monday at 4:50 AM Ireland time."

          );

          return;

        }


        const winnerList =
          data.winners

            .map(
              (name, index) =>
                `${index + 1}. ${name}`
            )

            .join("\n");


        await interaction.editReply({

          embeds: [

            new EmbedBuilder()

              .setTitle(
                "Guild Tome Winners"
              )

              .setDescription(
                winnerList
              )

          ]

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error loading Tome winners."
        );

      }


      return;
    }


    // =================================================
    // /preview
    // =================================================

    if (
      interaction.commandName ===
      "preview"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        processWeeklyDemotions(
          guild
        );


        const preview =
          getPromotionPreview(
            guild
          );


        const embeds =
          buildPreviewEmbeds(
            preview
          );


        await interaction.editReply({

          content:
            "Current promotion and demotion preview",

          embeds:
            embeds

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error creating promotion and demotion preview."
        );

      }


      return;
    }


    // =================================================
    // /promotion
    // =================================================

    if (
      interaction.commandName ===
      "promotion"
    ) {

      await interaction.deferReply({
        ephemeral: true
      });


      try {

        const person =
          interaction.options.getString(
            "person",
            true
          );


        const rank =
          interaction.options.getString(
            "rank",
            true
          );


        const guild =
          await fetchGuild();


        const result =
          addManualPromotion(
            guild,
            person,
            rank
          );


        if (
          !result.success
        ) {

          await interaction.editReply(
            result.error
          );

          return;

        }


        await interaction.editReply(

          `Promotion recorded: ` +
          `${result.name}: ` +
          `${getRankName(result.from)} -> ` +
          `${getRankName(result.to)}`

        );


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error recording promotion."
        );

      }


      return;
    }


    // =================================================
    // /demotion
    // =================================================

    if (
      interaction.commandName ===
      "demotion"
    ) {

      await interaction.deferReply({
        ephemeral: true
      });


      try {

        const person =
          interaction.options.getString(
            "person",
            true
          );


        const rank =
          interaction.options.getString(
            "rank",
            true
          );


        const guild =
          await fetchGuild();


        const result =
          addManualDemotion(
            guild,
            person,
            rank
          );


        if (
          !result.success
        ) {

          await interaction.editReply(
            result.error
          );

          return;

        }


        await interaction.editReply(

          `Demotion recorded: ` +
          `${result.name}: ` +
          `${getRankName(result.from)} -> ` +
          `${getRankName(result.to)}`

        );


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error recording demotion."
        );

      }


      return;
    }


    // =================================================
    // /report
    // =================================================

    if (
      interaction.commandName ===
      "report"
    ) {

      await interaction.deferReply();


      try {

        const guild =
          await fetchGuild();


        processWeeklyDemotions(
          guild
        );


        const preview =
          getPromotionPreview(
            guild
          );


        const tomeData =
          loadTomeWinners();


        const embeds =
          buildFullReportEmbeds(
            preview,
            tomeData
          );


        await interaction.editReply({

          content:
            "Weekly Guild Report",

          embeds:
            embeds

        });


      } catch (err) {

        console.error(err);


        await interaction.editReply(
          "Error creating weekly report."
        );

      }

    }

  }

);


// =====================================================
// AUTOMATIC TOME DRAW
// Monday 4:50 AM
// =====================================================

async function automaticTomeWinnerDraw() {

  const now =
    new Date();


  const dublinDate =
    new Date(
      now.toLocaleString(
        "en-IE",
        {
          timeZone:
            "Europe/Dublin"
        }
      )
    );


  if (
    dublinDate.getDay() !== 1 ||
    dublinDate.getHours() !== 4 ||
    dublinDate.getMinutes() !== 50
  ) {

    return;

  }


  const key =
    getCurrentWeekKey();


  if (
    lastAutomaticTomeDraw ===
    key
  ) {

    return;

  }


  lastAutomaticTomeDraw =
    key;


  try {

    const guild =
      await fetchGuild();


    const result =
      pickTomeWinners(
        guild
      );


    if (
      result.alreadyPicked
    ) {

      console.log(
        "Tome winners were already selected for this week."
      );

      return;

    }


    if (
      result.notEnoughPlayers
    ) {

      console.log(

        `Not enough weekly completions for the Tome draw: ` +
        `${result.eligibleCount}/14.`

      );

      return;

    }


    console.log(
      "Tome winners selected for the week."
    );


  } catch (err) {

    console.error(
      "Automatic Tome winner draw failed:",
      err
    );

  }

}


// =====================================================
// AUTOMATIC ST WEEKLY RESET
// Monday 4:55 AM
// =====================================================

async function automaticSTWeeklyReset() {

  const now =
    new Date();


  const dublinDate =
    new Date(
      now.toLocaleString(
        "en-IE",
        {
          timeZone:
            "Europe/Dublin"
        }
      )
    );


  if (
    dublinDate.getDay() !== 1 ||
    dublinDate.getHours() !== 4 ||
    dublinDate.getMinutes() !== 55
  ) {

    return;

  }


  const key =
    getCurrentWeekKey();


  if (
    lastAutomaticSTReset ===
    key
  ) {

    return;

  }


  lastAutomaticSTReset =
    key;


  try {

    const guild =
      await fetchGuild();


    const result =
      checkSTWeekly(
        guild
      );


    console.log(

      result.baselineUpdated

        ? "ST Weekly baseline updated."

        : "ST Weekly baseline did not need updating."

    );


  } catch (err) {

    console.error(
      "Automatic ST Weekly reset failed:",
      err
    );

  }

}


// =====================================================
// AUTOMATIC PREVIEW
// Monday 5:20 AM
// =====================================================

async function automaticPreview() {

  const now =
    new Date();


  const dublinDate =
    new Date(
      now.toLocaleString(
        "en-IE",
        {
          timeZone:
            "Europe/Dublin"
        }
      )
    );


  if (
    dublinDate.getDay() !== 1 ||
    dublinDate.getHours() !== 5 ||
    dublinDate.getMinutes() !== 20
  ) {

    return;

  }


  const key =
    getCurrentWeekKey();


  if (
    lastAutomaticPreview ===
    key
  ) {

    return;

  }


  lastAutomaticPreview =
    key;


  try {

    await sendPreviewReport();


    console.log(
      "Automatic promotion/demotion preview sent."
    );


  } catch (err) {

    console.error(
      "Automatic preview failed:",
      err
    );

  }

}


// =====================================================
// AUTOMATIC FULL REPORT
// Monday 8:00 PM
// =====================================================

async function automaticReport() {

  const now =
    new Date();


  const dublinDate =
    new Date(
      now.toLocaleString(
        "en-IE",
        {
          timeZone:
            "Europe/Dublin"
        }
      )
    );


  if (
    dublinDate.getDay() !== 1 ||
    dublinDate.getHours() !== 20 ||
    dublinDate.getMinutes() !== 0
  ) {

    return;

  }


  const key =
    getCurrentWeekKey();


  if (
    lastAutomaticReport ===
    key
  ) {

    return;

  }


  lastAutomaticReport =
    key;


  try {

    await sendFullReport();


    console.log(
      "Automatic weekly report sent."
    );


  } catch (err) {

    console.error(
      "Automatic weekly report failed:",
      err
    );

  }

}


// =====================================================
// CHECK AUTOMATIC TASKS EVERY MINUTE
// =====================================================

setInterval(
  () => {

    automaticTomeWinnerDraw();

    automaticSTWeeklyReset();

    automaticPreview();

    automaticReport();

  },
  60 * 1000
);


// =====================================================
// LOGIN
// =====================================================

client.login(
  process.env.DISCORD_TOKEN
);