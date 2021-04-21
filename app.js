const url = require("url");
const path = require("path");
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const Strategy = require("passport-discord").Strategy;
const config = require("./settings.json");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const Discord = require("discord.js");
const swal = require("sweetalert2");
const JSAlert = require("js-alert");
const settingsc = require("./settings.json");
const roles = require("./roles.json");
const channels = require("./channels.json");
const codesSchema = require("./models/codes.js");
const uptimeSchema = require("./models/uptime.js");
const banSchema = require("./models/site-ban.js");
const maintenceSchema = require("./models/bakim.js");
const app = express();
const MemoryStore = require("memorystore")(session);
const botsdata = require("./models/botlist/bots.js");
const fetch = require("node-fetch");

module.exports = async client => {
  const templateDir = path.resolve(`${process.cwd()}${path.sep}www`);
  app.use(
    "/css",
    express.static(path.resolve(`${templateDir}${path.sep}assets/css`))
  );
  app.use(
    "/js",
    express.static(path.resolve(`${templateDir}${path.sep}assets/js`))
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(
    new Strategy(
      {
        clientID: config.clientid,
        clientSecret: config.clientsecret,
        callbackURL: config.clientcallback,
        scope: ["identify", "guilds"]
      },
      (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => done(null, profile));
      }
    )
  );

  app.use(
    session({
      store: new MemoryStore({ checkPeriod: 86400000 }),
      secret:
        "#@%#&^$^$%@$^$&%#$%@#$%$^%&$%^#$%@#$%#E%#%@$FEErfgr3g#%GT%536c53cc6%5%tv%4y4hrgrggrgrgf4n",
      resave: false,
      saveUninitialized: false
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.engine("html", ejs.renderFile);
  app.set("view engine", "html");

  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true
    })
  );

  const renderTemplate = (res, req, template, data = {}) => {
    const baseData = {
      bot: client,
      path: req.path,
      user: req.isAuthenticated() ? req.user : null
    };
    res.render(
      path.resolve(`${templateDir}${path.sep}${template}`),
      Object.assign(baseData, data)
    );
  };

  const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.session.backURL = req.url;
    res.redirect("/login");
  };

  const checkMaintence = async (req, res, next) => {
    const d = await maintenceSchema.findOne({ server: settingsc.serverID });
    if (d) {
      if (req.isAuthenticated()) {
        if (
          client.guilds.cache
            .get(settingsc.serverID)
            .members.cache.get(req.user.id)
        ) {
          if (
            client.guilds.cache
              .get(settingsc.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.yonetici)
          ) {
            next();
          } else {
            res.redirect(
              "/error?code=200&message=Site kısa süreliğine bakıma alınmıştır."
            );
          }
        } else {
          res.redirect(
            "/error?code=200&message=Site kısa süreliğine bakıma alınmıştır."
          );
        }
      } else {
        res.redirect(
          "/error?code=200&message=Site kısa süreliğine bakıma alınmıştır."
        );
      }
    } else {
      next();
    }
  };

  app.get(
    "/login",
    (req, res, next) => {
      if (req.session.backURL) {
        req.session.backURL = req.session.backURL;
      } else if (req.headers.referer) {
        const parsed = url.parse(req.headers.referer);
        if (parsed.hostname === app.locals.domain) {
          req.session.backURL = parsed.path;
        }
      } else {
        req.session.backURL = "/";
      }
      next();
    },
    passport.authenticate("discord")
  );
  app.get(
    "/callback",
    passport.authenticate("discord", {
      failureRedirect:
        "/error?code=999&message=Siteye girerken bir hatayla karşılaştık."
    }),
    async (req, res) => {
      let banTespit = await banSchema.findOne({ user: req.user.id });
      if (banTespit) {
        client.users.fetch(req.user.id).then(async a => {
          client.channels.cache.get(channels.login).send(
            new Discord.MessageEmbed()
              .setAuthor(a.username, a.avatarURL({ dynamic: true }))
              .setThumbnail(a.avatarURL({ dynamic: true }))
              .setColor("RED")
              .setDescription(
                `**[${a.username}#${a.discriminator}](https://www.codelist.ml/user/${a.id})** isimli kullanıcı siteye giriş yapmaya çalıştı fakat siteden engellendiği için giriş yapamadı.`
              )
              .addField("İsim", a.username)
              .addField("Id", a.id)
              .addField("Tag", a.discriminator)
          );
        });
        req.session.destroy(() => {
          req.logout();
          res.redirect(
            "/error?code=401&message=Siteye girişiniz engellenmiş bulunmakta."
          );
        });
      } else {
        res.redirect(req.session.backURL || "/");
        client.users.fetch(req.user.id).then(async a => {
          client.channels.cache.get(channels.login).send(
            new Discord.MessageEmbed()
              .setAuthor(a.username, a.avatarURL({ dynamic: true }))
              .setThumbnail(a.avatarURL({ dynamic: true }))
              .setColor("GREEN")
              .setDescription(
                `**[${a.username}#${a.discriminator}](https://www.codelist.ml/user/${a.id})** isimli kullanıcı siteye giriş yaptı.`
              )
              .addField("İsim", a.username)
              .addField("Id", a.id)
              .addField("Tag", a.discriminator)
          );
        });
      }
    }
  );
  app.get("/logout", function(req, res) {
    req.session.destroy(() => {
      req.logout();
      res.redirect("/");
    });
  });

  //------------------- EXTRA -------------------//
  app.get("/", checkMaintence, async (req, res) => {
    const botdata = await botsdata.find();

    renderTemplate(res, req, "index.ejs", { config, roles, botdata, getuser });
  });
  app.get("/dc", (req, res) => {
    res.redirect("https://discord.gg/A2RcSY2vT4");
  });
  app.get("/error", (req, res) => {
    renderTemplate(res, req, "pages/error.ejs", { req });
  });
  app.get("/redirect", checkMaintence, (req, res) => {
    renderTemplate(res, req, "pages/redirect.ejs", { req, config, roles });
  });
  app.get("/team", checkMaintence, (req, res) => {
    renderTemplate(res, req, "team.ejs", { req, roles, config });
  });
  app.get("/partners", checkMaintence, (req, res) => {
    renderTemplate(res, req, "partners.ejs", { roles, config });
  });
  app.get("/bot-rules", checkMaintence, (req, res) => {
    renderTemplate(res, req, "/botlist/bot-rules.ejs", { config, roles });
  });

  //------------------- CODE SHARE  -------------------//
  app.get("/code/:code", checkMaintence, checkAuth, async (req, res) => {
    let kod = req.params.code;
    if (
      !client.guilds.cache
        .get(settingsc.serverID)
        .members.cache.get(req.user.id)
    )
      return res.redirect(
        "/error?code=403&message=To do this, you have to join our discord server."
      );
    codesSchema.findOne({ code: kod }, function(err, docs) {
      if (!docs) {
        res.redirect(
          "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
        );
      } else {
        if (docs.codeCategory == "javascript") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.javascript)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "html") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.html)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "subs") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.altyapilar)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "5invites") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.besdavet)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "10invites") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.ondavet)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "15invites") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.onbesdavet)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "20invites") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.yirmidavet)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        if (docs.codeCategory == "bdfd") {
          if (
            !client.guilds.cache
              .get(config.serverID)
              .members.cache.get(req.user.id)
              .roles.cache.get(roles.bdfd)
          )
            return res.redirect(
              "/error?code=403&message=Bu sayfayı görüntülemek için yetkiniz bulunmamakta."
            );
        }
        renderTemplate(res, req, "codeshare/codeview.ejs", {
          req,
          roles,
          config,
          docs
        });
      }
    });
  });
  app.get("/code-request", checkMaintence, checkAuth, async (req, res) => {
    renderTemplate(res, req, "codeshare/code-request.ejs", {
      req,
      roles,
      config
    });
  });
  app.post("/code-request", checkMaintence, checkAuth, async (req, res) => {
    client.users.fetch(req.user.id).then(a => {
      let rBody = req.body;
      client.channels.cache.get(channels.request).send(
        new Discord.MessageEmbed()
          .setTitle("Kod isteği")
          .setColor("GREEN")
          .setAuthor(a.username, a.avatarURL({ dynamic: true }))
          .setThumbnail(client.user.avatarURL({ dynamic: true }))
          .setDescription(
            `**[${a.username}#${
              a.discriminator
            }]**(https://www.codelist.ml/user/${a.id}) adlı kullanıcı \`${
              rBody["kodadi"]
            }\` kod isteğinde bulundu.`
          )
          .addField("Kod Açıklaması", rBody["aciklama"], true)
          .addField("Kod Kategorisi", rBody["kategori"], true)
          .setFooter(config.footer)
      );
    });
    return res.redirect("/user/" + req.user.id);
  });
  app.get("/codes", checkMaintence, checkAuth, async (req, res) => {
    let data = await codesSchema.find();
    renderTemplate(res, req, "codeshare/codes/codes.ejs", {
      req,
      roles,
      config,
      data
    });
  });
  app.get("/codes/:type", checkMaintence, checkAuth, async (req, res) => {
    let data = await codesSchema.find();
    renderTemplate(res, req, "codeshare/codes/codelist.ejs", {
      req,
      roles,
      config,
      data
    });
  });
  //------------------- CODE SHARE  -------------------//

  //------------------- UPTİME -------------------//
  const uptimedata = require("./models/uptime.js");
  app.get("/uptime/add", checkMaintence, checkAuth, async (req, res) => {
    renderTemplate(res, req, "uptime/ekle.ejs", { req, roles, config });
  });
  app.post("/uptime/add", checkMaintence, checkAuth, async (req, res) => {
    const rBody = req.body;
    if (!rBody["link"]) {
      res.redirect("?error=true&message=Write a any link.");
    } else {
      if (!rBody["link"].match("https"))
        return res.redirect(
          "?error=true&message=Geçerli bir link girmelisiniz."
        );
      const updcode = makeidd(5);
      const dde = await uptimedata.findOne({ link: rBody["link"] });
      const dd = await uptimedata.find({ userID: req.user.id });
      if (dd.length > 9)
        res.redirect("?error=true&message=Uptime ekleme limitiniz dolmuş.");

      if (dde)
        return res.redirect(
          "?error=true&message=Yazdığınız link zaten sistemde bulunuyor."
        );
      client.users.fetch(req.user.id).then(a => {
        client.channels.cache.get(channels.uptimelog).send(
          new Discord.MessageEmbed()
            .setAuthor(a.username, a.avatarURL({ dynamic: true }))
            .setDescription("Sisteme uptime eklendi.")
            .setThumbnail(client.user.avatarURL)
            .setColor("GREEN")
            .addField("Ekleyen Kullanıcı", `${a.tag} \`(${a.id})\``, true)
            .addField("Uptime Kodu", updcode, true)
            .addField("Uptime Limiti", `${dd.length + 1}/10`, true)
        );
        new uptimedata({
          server: config.serverID,
          userName: a.username,
          userID: req.user.id,
          link: rBody["link"],
          code: updcode
        }).save();
      });
      res.redirect(
        "?success=true&message=Yazdığınız link baışaryla sistemimize eklendi."
      );
    }
  });
  app.get("/uptime/links", checkMaintence, checkAuth, async (req, res) => {
    let uptimes = await uptimedata.find({ userID: req.user.id });
    renderTemplate(res, req, "uptime/linklerim.ejs", {
      req,
      roles,
      config,
      uptimes
    });
  });
  app.get(
    "/uptime/:code/delete",
    checkMaintence,
    checkAuth,
    async (req, res) => {
      const dde = await uptimedata.findOne({ code: req.params.code });
      if (!dde)
        return res.redirect(
          "/uptime/links?error=true&message=Sistemde böyle bir link bulunmuyor."
        );
      uptimedata.findOne({ code: req.params.code }, async function(err, docs) {
        if (docs.userID != req.user.id)
          return res.redirect(
            "/uptime/links?error=true&message=Silmeye çalıştığınız bağlantı size ait değil."
          );
        res.redirect(
          "/uptime/links?success=true&message=Link başarıyla sistemden kaldırıldı."
        );
        await uptimedata.deleteOne({ code: req.params.code });
      });
    }
  );
  //------------------- UPTİME -------------------//
  //------------------- SERVER LİST -------------------//
   app.get("/servers", checkMaintence, async (req,res) => {
        let page = req.query.page || 1;
	let data = await botsdata.find() || await botsdata.find().filter(b => b.status === "Approved")
	if(page < 1) return res.redirect(`/servers`);
	if(data.length <= 0) return res.redirect("/");
	if((page > Math.ceil(data.length / 8)))return res.redirect(`/servers`);
	if (Math.ceil(data.length / 8) < 1) {
	page = 1;
	};
        renderTemplate(res, req, "serverlist/servers.ejs", {
            req,
            roles,
            config,
            data,
            page: page
        });
      })
      app.get("/searchservers", checkMaintence, async (req,res) => {
        let page = req.query.page || 1;
        let data = await botsdata.find() || await botsdata.find().filter(b => b.status === "Approved");
       if(page < 1) return res.redirect(`/servers`);
       if(data.length <= 0) return res.redirect("/");
       if((page > Math.ceil(data.length / 8)))return res.redirect(`/servers`);
        if (Math.ceil(data.length / 8) < 1) {
            page = 1;
        };
        renderTemplate(res, req, "serverlist/search.ejs", {
            req,
            roles,
            config,
            data,
            page: page
        });
      })
  //------------------- SERVER LİST -------------------//
  //------------------- BOT LİST -------------------//

  app.get("/bots", checkMaintence, async (req, res) => {
    let page = req.query.page || 1;
    let data =
      (await botsdata.find()) ||
      (await botsdata.find().filter(b => b.status === "Approved"));
    if (page < 1) return res.redirect(`/bots`);
    if (data.length <= 0) return res.redirect("/");
    if (page > Math.ceil(data.length / 8)) return res.redirect(`/bots`);
    if (Math.ceil(data.length / 8) < 1) {
      page = 1;
    }
    renderTemplate(res, req, "botlist/bots.ejs", {
      req,
      roles,
      config,
      data,
      page: page
    });
  });
  app.get("/search", checkMaintence, async (req, res) => {
    let page = req.query.page || 1;
    let data =
      (await botsdata.find()) ||
      (await botsdata.find().filter(b => b.status === "Approved"));
    if (page < 1) return res.redirect(`/bots`);
    if (data.length <= 0) return res.redirect("/");
    if (page > Math.ceil(data.length / 8)) return res.redirect(`/bots`);
    if (Math.ceil(data.length / 8) < 1) {
      page = 1;
    }
    renderTemplate(res, req, "botlist/search.ejs", {
      req,
      roles,
      config,
      data,
      page: page
    });
  });
  app.get("/addbot", checkMaintence, checkAuth, async (req, res) => {
    if (
      !client.guilds.cache
        .get(settingsc.serverID)
        .members.cache.get(req.user.id)
    )
      return res.redirect(
        "/error?code=403&message=To do this, you have to join our discord server."
      );
    renderTemplate(res, req, "botlist/addbot.ejs", { req, roles, config });
  });
  app.get("/bot/:botID/vote", checkMaintence, checkAuth, async (req, res) => {
    let botdata = await botsdata.findOne({ botID: req.params.botID });
    if (!botdata)
      return res.redirect(
        "/error?code=404&message=Geçersiz bir bot ıd'si girdiniz."
      );
    if (
      !req.user.id === botdata.ownerID ||
      req.user.id.includes(botdata.coowners)
    ) {
      if (botdata.status != "Approved")
        return res.redirect(
          "/error?code=404&message=Geçersiz bir bot ıd'si girdiniz."
        );
    }

    renderTemplate(res, req, "botlist/vote.ejs", {
      req,
      roles,
      config,
      botdata
    });
  });
  app.post("/bot/:botID/vote", checkMaintence, checkAuth, async (req, res) => {
    const votes = require("./models/botlist/vote.js");
    let botdata = await botsdata.findOne({ botID: req.params.botID });
    let x = await votes.findOne({ user: req.user.id, bot: req.params.botID });
    if (x)
      return res.redirect(
        "/error?code=400&message=12 saate sadece 1 oy verebilirsiniz."
      );
    await votes.findOneAndUpdate(
      { bot: req.params.botID, user: req.user.id },
      { $set: { Date: Date.now(), ms: 43200000 } },
      { upsert: true }
    );
    await botsdata.findOneAndUpdate(
      { botID: req.params.botID },
      { $inc: { votes: 1 } }
    );
    client.channels.cache
      .get(channels.votes)
      .send(
        `\`${req.user.username}\` adlı kullanıcı \`${
          botdata.username
        }\` adlı bota oy verdi! (\`${botdata.votes + 1}\`) oyu oldu`
      );
    return res.redirect(
      `/bot/${req.params.botID}/vote?success=true&message=Başarıyla oy verdiniz.`
    );
    renderTemplate(res, req, "botlist/vote.ejs", {
      req,
      roles,
      config,
      botdata
    });
  });

  app.post("/addbot", checkMaintence, checkAuth, async (req, res) => {
    let rBody = req.body;
    let botvarmi = await botsdata.findOne({ botID: rBody["botID"] });
    client.users.fetch(req.body.botID).then(async a => {
      if (!a.bot)
        return res.redirect(
          "/error?code=404&message=Geçersiz bir bot ıd'si girdiniz."
        );
      if (!a)
        return res.redirect(
          "/error?code=404&message=Geçersiz bir bot ıd'si girdiniz."
        );
      if (rBody["coowners"]) {
        if (String(rBody["coowners"]).split(",").length > 3)
          return res.redirect(
            "?error=true&message=En fazla 3 diğer owner ekleyebilirsiniz."
          );
        if (
          String(rBody["coowners"])
            .split(",")
            .includes(req.user.id)
        )
          return res.redirect(
            "?error=true&message=Kendinizi diğer ownerlere ekleyemezsiniz."
          );
      }
      if (botvarmi)
        return res.redirect(
          "?error=true&message=Böyle bir bot zaten sistemde bulunuyor."
        );
      await new botsdata({
        botID: rBody["botID"],
        ownerID: req.user.id,
        ownerName: req.user.usename,
        username: a.username,
        discrim: a.discriminator,
        avatar: a.avatarURL(),
        prefix: rBody["prefix"],
        longDesc: rBody["longDesc"],
        shortDesc: rBody["shortDesc"],
        status: "UnApproved",
        tags: rBody["tags"],
        certificate: "None",
        premium: "None"
      }).save();
      if (rBody["github"]) {
        await botsdata.findOneAndUpdate(
          { botID: rBody["botID"] },
          { $set: { github: rBody["github"] } },
          function(err, docs) {}
        );
      }
      if (rBody["website"]) {
        await botsdata.findOneAndUpdate(
          { botID: rBody["botID"] },
          { $set: { website: rBody["website"] } },
          function(err, docs) {}
        );
      }
      if (rBody["support"]) {
        await botsdata.findOneAndUpdate(
          { botID: rBody["botID"] },
          { $set: { support: rBody["support"] } },
          function(err, docs) {}
        );
      }
      if (rBody["coowners"]) {
        if (String(rBody["coowners"]).split(",").length > 3)
          return res.redirect(
            "?error=true&message=En fazla 3 diğer owner ekleyebilirsiniz."
          );
        if (
          String(rBody["coowners"])
            .split(",")
            .includes(req.user.id)
        )
          return res.redirect(
            "?error=true&message=You cannot add yourself to other CO-Owners"
          );
        await botsdata.findOneAndUpdate(
          { botID: rBody["botID"] },
          { $set: { coowners: String(rBody["coowners"]).split(",") } },
          function(err, docs) {}
        );
      }
    });
    client.users.fetch(rBody["botID"]).then(a => {
      client.channels.cache
        .get(channels.botlog)
        .send(
          `> \`${a.tag}\` adlı bot başarıyla sisteme eklendi, beklemede kalınız. **Geliştirici ->** <@${req.user.id}>`
        ); //ab burdamısın?
      res.redirect(
        `?success=true&message=Your bot has been successfully added to the system.&botID=${
          rBody["botID"]
        }`
      );
    });
  });
  const { JsonDatabase } = require("wio.db");

  const db = new JsonDatabase("myDatabase");

  app.get("/url/:botID", checkMaintence, async (req, res, next) => {
    let fetch = db.fetch(`özel_url_${req.params.botID}`);
    if (!fetch) return res.redirect("/error?code=404&message=Hatalı Bot URL");

    let botdata = await botsdata.findOne({ botID: fetch });
    if (!botdata) return res.redirect("/error?code=404&message=Hatalı Bot ID");
    if (botdata.status != "Approved") {
      if (
        req.user.id == botdata.ownerID ||
        botdata.coowners.includes(req.user.id)
      ) {
        let coowner = new Array();
        botdata.coowners.map(a => {
          client.users.fetch(a).then(b => coowner.push(b));
        });
        client.users.fetch(botdata.ownerID).then(aowner => {
          client.users.fetch(fetch).then(abot => {
            renderTemplate(res, req, "botlist/bot.ejs", {
              req,
              abot,
              config,
              botdata,
              coowner,
              aowner,
              roles
            });
          });
        });
      } else {
        res.redirect(
          "/error?code=404&message=To edit this bot, you must be one of its owners."
        );
      }
    } else {
      let coowner = new Array();
      botdata.coowners.map(a => {
        client.users.fetch(a).then(b => coowner.push(b));
      });
      client.users.fetch(botdata.ownerID).then(aowner => {
        client.users.fetch(fetch).then(abot => {
          renderTemplate(res, req, "botlist/bot.ejs", {
            req,
            abot,
            config,
            botdata,
            coowner,
            aowner,
            roles
          });
        });
      });
    }
  });
  app.get("/bot/:botID", checkMaintence, async (req, res, next) => {
    let yonlendrs = db.fetch(`özel_urls_${req.params.botID}`);

    if (db.fetch(`özel_urls_${req.params.botID}`))
      return res.redirect(`/url/${yonlendrs}`);

    let botdata = await botsdata.findOne({ botID: req.params.botID });
    if (!botdata) return res.redirect("/error?code=404&message=Hatalı Bot ID");
    if (botdata.status != "Approved") {
      if (
        req.user.id == botdata.ownerID ||
        botdata.coowners.includes(req.user.id)
      ) {
        let coowner = new Array();
        botdata.coowners.map(a => {
          client.users.fetch(a).then(b => coowner.push(b));
        });
        client.users.fetch(botdata.ownerID).then(aowner => {
          client.users.fetch(req.params.botID).then(abot => {
            renderTemplate(res, req, "botlist/bot.ejs", {
              req,
              abot,
              config,
              botdata,
              coowner,
              aowner,
              roles
            });
          });
        });
      } else {
        res.redirect(
          "/error?code=404&message=To edit this bot, you must be one of its owners."
        );
      }
    } else {
      let coowner = new Array();
      botdata.coowners.map(a => {
        client.users.fetch(a).then(b => coowner.push(b));
      });
      client.users.fetch(botdata.ownerID).then(aowner => {
        client.users.fetch(req.params.botID).then(abot => {
          renderTemplate(res, req, "botlist/bot.ejs", {
            req,
            abot,
            config,
            botdata,
            coowner,
            aowner,
            roles
          });
        });
      });
    }
  });

  app.get("/bot/:botID/edit", checkMaintence, checkAuth, async (req, res) => {
    let botdata = await botsdata.findOne({
      botID: db.fetch(`özel_url_${req.params.botID}`) || req.params.botID
    });
    if (!botdata) return res.redirect("/error?code=404&message=Hatalı Bot ID");
    if (
      req.user.id == botdata.ownerID ||
      botdata.coowners.includes(req.user.id)
    ) {
      renderTemplate(res, req, "botlist/bot-edit.ejs", {
        req,
        config,
        botdata,
        roles
      });
    } else {
      res.redirect(
        "/error?code=404&message=To edit this bot, you must be one of its owners."
      );
    }
  });

  app.post("/bot/:botID/edit", checkMaintence, checkAuth, async (req, res) => {
    let rBody = req.body;
    let botdata = await botsdata.findOne({
      botID: db.fetch(`özel_url_${req.params.botID}`) || req.params.botID
    });
    if (String(rBody["coowners"]).split(",").length > 3)
      return res.redirect(
        "?error=true&message=You can add up to 3 CO-Owners.."
      );
    if (
      String(rBody["coowners"])
        .split(",")
        .includes(req.user.id)
    )
      return res.redirect(
        "?error=true&message=You cannot add yourself to other CO-Owners."
      );
    await botsdata.findOneAndUpdate(
      { botID: db.fetch(`özel_url_${req.params.botID}`) || req.params.botID },
      {
        $set: {
          botID: db.fetch(`özel_url_${req.params.botID}`) || req.params.botID,
          ownerID: botdata.ownerID,
          prefix: rBody["prefix"],
          longDesc: rBody["longDesc"],
          shortDesc: rBody["shortDesc"],
          tags: rBody["tags"],
          github: rBody["github"],
          website: rBody["website"],
          support: rBody["support"],
          coowners: String(rBody["coowners"]).split(",")
        }
      },
      function(err, docs) {}
    );
    client.users
      .fetch(db.fetch(`özel_url_${req.params.botID}`) || req.params.botID)
      .then(a => {
        client.channels.cache
          .get(channels.botlog)
          .send(
            `> <@${req.user.id}> adlı kullanıcı \`${a.tag}\` adlı botu başarıyla düzenledi.`
          );
        res.redirect(
          `?success=true&message=Your bot has been successfully edited.&botID=${req.params.botID}`
        );
      });
  });

  //------------------- BOT LİST -------------------//

  //---------------- ADMIN ---------------\\
  const appsdata = require("./models/botlist/certificate-apps.js");
  // CERTIFICATE APP
  app.get("/certification", checkMaintence, checkAuth, async (req, res) => {
    renderTemplate(res, req, "/botlist/apps/certification.ejs", {
      req,
      roles,
      config
    });
  });
  app.get(
    "/certification/apply",
    checkMaintence,
    checkAuth,
    async (req, res) => {
      const userbots = await botsdata.find({ ownerID: req.user.id });
      renderTemplate(res, req, "/botlist/apps/certificate-app.ejs", {
        req,
        roles,
        config,
        userbots
      });
    }
  );
  app.post(
    "/certification/apply",
    checkMaintence,
    checkAuth,
    async (req, res) => {
      const rBody = req.body;
      new appsdata({
        botID: rBody["bot"],
        hundred: rBody["onehundred"],
        future: rBody["future"]
      }).save();
      res.redirect(
        "/bots?success=true&message=Certificate application applied."
      );
      let botdata = await botsdata.findOne({ botID: rBody["bot"] });
      client.channels.cache
        .get(channels.botlog)
        .send(
          `> \`${botdata.username}\` adlı bota sertifika talebi oluşturuldu! **Geliştirici ->** <@${botdata.ownerID}>`
        ); //abbbbbb
    }
  );
  //
  const checkAdmin = async (req, res, next) => {
    if (
      client.guilds.cache
        .get(config.serverID)
        .members.cache.get(req.user.id)
        .roles.cache.get(roles.yonetici) ||
      client.guilds.cache
        .get(config.serverID)
        .members.cache.get(req.user.id)
        .roles.cache.get(roles.moderator)
    ) {
      next();
    } else {
      res.redirect("/error?code=403&message=You is not competent to do this.");
    }
  };
  app.get("/admin", checkMaintence, checkAdmin, checkAuth, async (req, res) => {
    const botdata = await botsdata.find();
    const codedata = await codesSchema.find();
    const udata = await uptimedata.find();
    renderTemplate(res, req, "admin/index.ejs", {
      req,
      roles,
      config,
      codedata,
      botdata,
      udata
    });
  });
  // MINI PAGES
  app.get(
    "/admin/unapproved",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.find();
      renderTemplate(res, req, "admin/unapproved.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.get(
    "/admin/approved",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.find();
      renderTemplate(res, req, "admin/approved.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.get(
    "/admin/certificate-apps",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.find();
      const apps = await appsdata.find();
      renderTemplate(res, req, "admin/certificate-apps.ejs", {
        req,
        roles,
        config,
        apps,
        botdata
      });
    }
  );
  // SYSTEMS PAGES

  // CONFIRM BOT
  app.get(
    "/admin/confirm/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      await botsdata.findOneAndUpdate(
        { botID: req.params.botID },
        {
          $set: {
            status: "Approved",
            Date: Date.now()
          }
        },
        function(err, docs) {}
      );
      client.users.fetch(req.params.botID).then(bota => {
        client.channels.cache
          .get(channels.botlog)
          .send(
            `> \`${bota.tag}\` adlı bot \`${req.user.username}\` adlı yetkili tarafından kabul edildi! **Geliştirici ->** <@${botdata.ownerID}>`
          );
        client.users.cache
          .get(botdata.ownerID)
          .send(
            `> \`${bota.tag}\` adlı botun kabul edildi\nYetkili: \`${req.user.username}\``
          );
      });
      return res.redirect(
        `/admin/unapproved?success=true&message=Bot approved.`
      );
    }
  );
  // DELETE BOT
  app.get(
    "/admin/delete/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      await botsdata.deleteOne({
        botID: req.params.botID,
        ownerID: botdata.ownerID
      });
      return res.redirect(`/admin/approved?success=true&message=Bot deleted.`);
    }
  );
  // DECLINE BOT
  app.get(
    "/admin/decline/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      renderTemplate(res, req, "admin/decline.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.post(
    "/admin/decline/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      let rBody = req.body;
      let botdata = await botsdata.findOne({ botID: req.params.botID });
      client.users.fetch(botdata.ownerID).then(sahip => {
        client.channels.cache
          .get(channels.botlog)
          .send(
            `> \`${botdata.username}\` adlı bot \`${
              rBody["reason"]
            }\` sebebiyle \`${req.user.username}\` tarafından reddedildi.`
          );
        client.users.cache
          .get(botdata.ownerID)
          .send(
            `> \`${botdata.username}\` adlı botun reddedildi.\nSebebi: \`${
              rBody["reason"]
            }\`\nYetkili: \`${req.user.username}\``
          );
      });
      await botsdata.deleteOne({
        botID: req.params.botID,
        ownerID: botdata.ownerID
      });
      return res.redirect(
        `/admin/unapproved?success=true&message=Bot declined.`
      );
    }
  );

  // PREMIUM
  app.get(
    "/admin/premium",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.find();
      renderTemplate(res, req, "admin/premium.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.get(
    "/admin/premium/give/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      await botsdata.findOneAndUpdate(
        { botID: req.params.botID },
        {
          $set: {
            premium: "Premium"
          }
        },
        function(err, docs) {}
      );
      client.users.fetch(botdata.botID).then(bot => {
        return res.redirect(
          `/admin/premium?success=true&message=You gived the premium of the bot named ${bot.tag}`
        );
        client.users.cache
          .get(botdata.ownerID)
          .send(`> \`${botdata.username}\` adlı botuna premium verildi.`);
      });
      return res.redirect(
        `/admin/premium?success=true&message=Premium verildi.`
      );
    }
  );
  app.get(
    "/admin/premium/delete/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      await botsdata.findOneAndUpdate(
        { botID: req.params.botID },
        {
          $set: {
            premium: "None"
          }
        },
        function(err, docs) {}
      );
      client.users.fetch(botdata.botID).then(bota => {
        client.users.cache
          .get(botdata.ownerID)
          .send(
            `> \`${botdata.username}\` adlı botunun premiumu kaldırıldı.\nYetkili: **${req.user.username}**`
          );
      });
      return res.redirect(
        `/admin/premium?success=true&message=Premium iptal edildi.`
      );
    }
  );

  // CERTIFICATE
  app.get(
    "/admin/certified-bots",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.find();
      renderTemplate(res, req, "admin/certified-bots.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.get(
    "/admin/certificate/give/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      await botsdata.findOneAndUpdate(
        { botID: req.params.botID },
        {
          $set: {
            certificate: "Certified"
          }
        },
        function(err, docs) {}
      );
      let botdata = await botsdata.findOne({ botID: req.params.botID });

      client.users.fetch(botdata.botID).then(bota => {
        client.channels.cache
          .get(channels.botlog)
          .send(
            `> \`${bota.tag}\` adlı botun sertifika talebi \`${req.user.username}\` tarafından kabul edildi! **Geliştirici ->** <@${botdata.ownerID}>`
          );
        client.users.cache
          .get(botdata.ownerID)
          .send(
            `> **\`${bota.tag}\` adlı botunun sertifika talebi \`${req.user.username}\` tarafından kabul edildi!`
          );
      });
      await appsdata.deleteOne({ botID: req.params.botID });
      return res.redirect(
        `/admin/certificate-apps?success=true&message=Certificate gived.&botID=${req.params.botID}`
      );
    }
  );
  app.get(
    "/admin/certificate/delete/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const botdata = await botsdata.findOne({ botID: req.params.botID });
      if (!botdata)
        return res.redirect("/error?code=404&message=Hatalı Bot ID");
      renderTemplate(res, req, "admin/certificate-delete.ejs", {
        req,
        roles,
        config,
        botdata
      });
    }
  );
  app.post(
    "/admin/certificate/delete/:botID",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      let rBody = req.body;
      await botsdata.findOneAndUpdate(
        { botID: req.params.botID },
        {
          $set: {
            certificate: "None"
          }
        },
        function(err, docs) {}
      );
      let botdata = await botsdata.findOne({ botID: req.params.botID });
      client.users.fetch(botdata.botID).then(bota => {
        client.channels.cache
          .get(channels.botlog)
          .send(
            `> \`${bota.tag}\` adlı botun sertifika talebi \`${
              rBody["reason"]
            }\` sebebiyle \`${
              req.user.username
            }\` tarafından reddedildi. **Geliştirici ->** <@${botdata.ownerID}>`
          );
        client.users.cache
          .get(botdata.ownerID)
          .send(
            `> **\`${bota.tag}\` adlı botunun sertifika talebi \`${
              rBody["reason"]
            }\` sebebiyle \`${req.user.username}\` tarafından reddedildi.`
          );
      });
      return res.redirect(
        `/admin/certificate-apps?success=true&message=Certificate deleted.`
      );
    }
  );

  // CODE SHARE
  app.get(
    "/admin/codes",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      let koddata = await codesSchema.find();
      renderTemplate(res, req, "admin/codes.ejs", {
        req,
        roles,
        config,
        koddata
      });
    }
  );
  // ADDCODE
  app.get(
    "/admin/addcode",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      renderTemplate(res, req, "admin/addcode.ejs", { req, roles, config });
    }
  );
  app.post(
    "/admin/addcode",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const rBody = req.body;
      let kod = makeid(5);
      new codesSchema({
        code: kod,
        codeName: rBody["codename"],
        codeCategory: rBody["category"],
        codeDesc: rBody["codedesc"]
      }).save();
      if (rBody["main"]) {
        await codesSchema.findOneAndUpdate(
          { code: kod },
          { $set: { main: rBody["main"] } },
          function(err, docs) {}
        );
      }
      if (rBody["commands"]) {
        await codesSchema.findOneAndUpdate(
          { code: kod },
          { $set: { commands: rBody["commands"] } },
          function(err, docs) {}
        );
      }
      client.channels.cache.get(channels.codelog).send(
        new Discord.MessageEmbed()
          .setTitle("Yeni Bir Kod Eklendi!")
          .setColor("GREEN")
          .setFooter(config.footer)
          .setDescription(
            `**[${req.user.username}](https://www.codelist.ml/user/${
              req.user.id
            })** adlı kullanıcı \`${rBody["codename"]}\` komutunu ekledi.`
          )
          .addField("Kod Linki", `https://www.codelist.ml/code/${kod}`, true)
          .addField("Kod Açıklaması", rBody["codedesc"], true)
          .addField("Kod Kategorisi", rBody["category"], true)
      );
      res.redirect("/code/" + kod);
    }
  );

  // EDITCODE
  app.get(
    "/admin/editcode/:code",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      let kod = req.params.code;
      let koddata = await codesSchema.findOne({ code: kod });
      if (!koddata)
        return res.redirect(
          "/codes?error=true&message=You entered an invalid code."
        );
      renderTemplate(res, req, "admin/editcode.ejs", {
        req,
        roles,
        config,
        koddata
      });
    }
  );
  app.post(
    "/admin/editcode/:code",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      const rBody = req.body;
      let kod = req.params.code;
      await codesSchema.findOneAndUpdate(
        { code: kod },
        {
          $set: {
            codeName: rBody["codename"],
            codeCategory: rBody["category"],
            codeDesc: rBody["codedesc"],
            main: rBody["main"],
            commands: rBody["commands"]
          }
        },
        function(err, docs) {}
      );
      client.channels.cache.get(channels.codelog).send(
        new Discord.MessageEmbed()
          .setTitle("Kod Düzenlendi!")
          .setColor("GREEN")
          .setFooter(config.footer)
          .setDescription(
            `The user named **[${
              req.user.username
            }](https://www.codelist.ml/user/${
              req.user.id
            })** adlı kullanıcı \`${rBody["codename"]}\` kodunu düzenledi.`
          )
          .addField("Kod Linki", `https://www.codelist.ml/code/${kod}`, true)
          .addField("Kod Açıklama", rBody["codedesc"], true)
          .addField("Kod Kategori", rBody["category"], true)
      );
      res.redirect("/code/" + kod);
    }
  );
  // DELETECODE
  app.get(
    "/admin/deletecode/:code",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      await codesSchema.deleteOne({ code: req.params.code });
      return res.redirect("/admin/codes?error=true&message=Code deleted.");
    }
  );

  // UPTIME
  // UPTIMES
  app.get(
    "/admin/uptimes",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      let updata = await uptimeSchema.find();
      renderTemplate(res, req, "admin/uptimes.ejs", {
        req,
        roles,
        config,
        updata
      });
    }
  );
  app.get(
    "/admin/deleteuptime/:code",
    checkMaintence,
    checkAdmin,
    checkAuth,
    async (req, res) => {
      await uptimeSchema.deleteOne({ code: req.params.code });
      return res.redirect("/admin/uptimes?error=true&message=Link deleted.");
    }
  );
  //---------------- ADMIN ---------------\\

  //------------------- PROFILE -------------------//

  const profiledata = require("./models/profile.js");
  app.get("/user/:userID", checkMaintence, async (req, res) => {
    client.users.fetch(req.params.userID).then(async a => {
      let codecount = await codesSchema.find({ sharer: a.id });
      const pdata = await profiledata.findOne({ userID: a.id });
      const botdata = await botsdata.find();
      const member = a;
      const uptimecount = await uptimedata.find({ userID: a.id });
      renderTemplate(res, req, "profile/profile.ejs", {
        member,
        req,
        roles,
        config,
        codecount,
        uptimecount,
        pdata,
        botdata
      });
    });
  });
  app.get("/user/:userID/edit", checkMaintence, checkAuth, async (req, res) => {
    client.users.fetch(req.user.id).then(async member => {
      const pdata = await profiledata.findOne({ userID: member.id });
      renderTemplate(res, req, "profile/profile-edit.ejs", {
        member,
        req,
        roles,
        config,
        pdata,
        member
      });
    });
  });
  app.post(
    "/user/:userID/edit",
    checkMaintence,
    checkAuth,
    async (req, res) => {
      let rBody = req.body;
      await profiledata.findOneAndUpdate(
        { userID: req.user.id },
        { $set: { biography: rBody["biography"] } },
        { upsert: true }
      );
      await profiledata.findOneAndUpdate(
        { userID: req.user.id },
        { $set: { website: rBody["website"] } },
        { upsert: true }
      );
      await profiledata.findOneAndUpdate(
        { userID: req.user.id },
        { $set: { github: rBody["github"] } },
        { upsert: true }
      );
      await profiledata.findOneAndUpdate(
        { userID: req.user.id },
        { $set: { twitter: rBody["twitter"] } },
        { upsert: true }
      );
      await profiledata.findOneAndUpdate(
        { userID: req.user.id },
        { $set: { instagram: rBody["instagram"] } },
        { upsert: true }
      );
      return res.redirect(
        "?success=true&message=Your profile has been successfully edited."
      );
    }
  );
  //------------------- PROFILE -------------------//
  app.set("json spaces", 2);
  //------------------- API  -------------------//
  app.get("/api/:botID", checkMaintence, async (req, res) => {
    const botdata = await botsdata.findOne({ botID: req.params.botID });
    if (!botdata)
      res.json({
        error: true,
        message: "This bot id not a function",
        errorcode: 404
      });
    res.header("Content-Type", "application/json");
    res.json(botdata);
  });
  app.get("/api/:botID//:userID", checkMaintence, async (req, res) => {
    const votedatas = require("./models/botlist/vote.js");
    const bots = await botsdata.findOne({ botID: req.params.botID });
    const botdata = await votedatas.findOne({
      bot: req.params.botID,
      user: req.params.userID
    });
    if (!bots)
      return res.json({
        error: true,
        message: "This bot id not a function",
        errorcode: 404
      });
    res.header("Content-Type", "application/json");
    if (botdata) {
      res.json({ user: req.params.userID, hasvote: true });
    } else {
      res.json({ user: req.params.userID, hasvote: false });
    }
  });
  app.get("/api/search/:search", checkMaintence, async (req, res) => {
    const votedatas = require("./models/botlist/vote.js");
    const botdata = await botsdata.find();
    res.header("Content-Type", "application/json");
    botdata.map(a => {
      if (
        a.username
          .toLowerCase()
          .includes(req.params.search.toLocaleLowerCase()) ||
        a.shortDesc.toLowerCase().includes(req.params.search.toLowerCase())
      ) {
        res.json({
          botID: a.botID,
          votes: a.votes,
          owner: a.ownerName,
          ownerID: a.ownerID,
          coowners: a.coowners
        });
      } else {
        res.json({
          error: true,
          message: "Search result not founded.",
          errorcode: 404
        });
      }
    });
  });
  //------------------- API -------------------//
  app.get("*", function(req, res) {
    res
      .status(404)
      .redirect("/error?code=404&message=You look like you lost your way.");
  });

  app.listen(3000, () =>
    console.log(`Dashboard is up and running on port ${config.port}.`)
  );
};

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function makeidd(length) {
  var result = "";
  var characters =
    "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getuser(id) {
  try {
    return client.users.fetch(id);
  } catch (error) {
    return undefined;
  }
}
//bu ne ab :=o
