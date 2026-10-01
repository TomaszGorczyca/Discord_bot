require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");


const rankChoices = [

  {
    name: "Recruit",
    value: "recruit"
  },

  {
    name: "Recruiter",
    value: "recruiter"
  },

  {
    name: "Captain",
    value: "captain"
  },

  {
    name: "Strategist",
    value: "strategist"
  },

  {
    name: "Chief",
    value: "chief"
  }

];


const commands = [

  // ===================================================
  // EXISTING COMMANDS
  // ===================================================

  new SlashCommandBuilder()

    .setName("weekly")

    .setDescription(
      "Show weekly guild progress"
    ),


  new SlashCommandBuilder()

    .setName("inactive")

    .setDescription(
      "Show members inactive for 2+ weeks"
    ),


  new SlashCommandBuilder()

    .setName("graids")

    .setDescription(
      "Show recent Guild Raid completions"
    ),


  new SlashCommandBuilder()

    .setName("stweekly")

    .setDescription(
      "Show weekly streak progress"
    ),


  new SlashCommandBuilder()

    .setName("tomewinners")

    .setDescription(
      "Show this week's Tome winners"
    ),


  // ===================================================
  // PROMOTION / DEMOTION
  // ===================================================

  new SlashCommandBuilder()

    .setName("preview")

    .setDescription(
      "Show the current promotion and demotion preview"
    ),


  new SlashCommandBuilder()

    .setName("promotion")

    .setDescription(
      "Record a manual promotion"
    )

    .addStringOption(
      option =>
        option

          .setName("person")

          .setDescription(
            "Guild member name"
          )

          .setRequired(true)
    )

    .addStringOption(
      option =>
        option

          .setName("rank")

          .setDescription(
            "Target rank"
          )

          .setRequired(true)

          .addChoices(
            ...rankChoices
          )
    ),


  new SlashCommandBuilder()

    .setName("demotion")

    .setDescription(
      "Record a manual demotion"
    )

    .addStringOption(
      option =>
        option

          .setName("person")

          .setDescription(
            "Guild member name"
          )

          .setRequired(true)
    )

    .addStringOption(
      option =>
        option

          .setName("rank")

          .setDescription(
            "Target rank"
          )

          .setRequired(true)

          .addChoices(
            ...rankChoices
          )
    ),


  // ===================================================
  // FULL REPORT
  // ===================================================

  new SlashCommandBuilder()

    .setName("report")

    .setDescription(
      "Show the full weekly guild report"
    )

]
.map(
  command =>
    command.toJSON()
);
//sasd

const rest =
  new REST({
    version: "10"
  })
  .setToken(
    process.env.DISCORD_TOKEN
  );


async function deploy() {

  try {

    console.log(
      "Registering slash commands..."
    );


    await rest.put(

      Routes.applicationGuildCommands(

        process.env.CLIENT_ID,

        process.env.GUILD_ID

      ),

      {
        body:
          commands
      }

    );


    console.log(
      "Slash commands registered."
    );


  } catch (err) {

    console.error(err);

  }

}


deploy();