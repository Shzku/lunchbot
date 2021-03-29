import moment from "moment/";
import { Exception } from "@poppinss/utils";
import { fetch, image, ocr, parse } from "App/Common/MenuFunctions";
import { getMenu } from "App/Common/HelperFunctions";
import User from "App/Models/User";
import Server from "App/Models/Server";
import { generateCalendar } from "App/Common/CalendarFunctions";
import * as fs from "fs/promises";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Event from "@ioc:Adonis/Core/Event";

export default class WebController {
  public async image({ params }: HttpContextContract) {
    return image(params.url, null);
  }

  public async fetch({ request }: HttpContextContract) {
    const params = request.all();
    const date = moment(params.date, params.format);

    if (!date.isValid())
      throw new Exception("Datum / datumformat som anges är ogiltigt.");

    if (!params.url)
      throw new Exception("Ingen hämtningsadress tillhandahålls.");

    return fetch(date, params.url, false);
  }

  public async ocr({ request }: HttpContextContract) {
    const params = request.all();
    return await ocr(params.file);
  }

  public async parse({ request }: HttpContextContract) {
    const params = request.all();
    return parse(params.text, moment());
  }

  public async process({ request }: HttpContextContract) {
    const params = request.all();
    const date = moment(params.date, params.format);

    if (!date.isValid())
      throw new Exception("Datum / datumformat som anges är ogiltigt.");

    return getMenu(date, true, true);
  }

  public async add_user({ request }: HttpContextContract) {
    const params = request.all();

    const user = await User.firstOrCreate(
      { user_id: params.user_id },
      { user_id: params.user_id, enabled: false }
    );

    if (!user.enabled) {
      user.enabled = true;
      await user.save();
    } else {
      user.enabled = false;
      await user.save();
    }

    return user;
  }

  public async add_server({ request }: HttpContextContract) {
    const params = request.all();

    const server = await Server.firstOrCreate(
      { channel_id: params.channel_id },
      {
        server_id: params.server_id,
        channel_id: params.channel_id,
        enabled: false,
      }
    );

    if (!server.enabled) {
      server.enabled = true;
      await server.save();
    } else {
      server.enabled = false;
      await server.save();
    }

    return server;
  }

  public async regenerate_calendar() {
    const calendar = await generateCalendar();
    await fs.writeFile("./tmp/eatery-calendar.ical", calendar);
    return calendar;
  }

  public async dump() {
    return {
      users: await User.all(),
      servers: await Server.all(),
    };
  }

  public async dispatch() {
    const date = moment();
    const data = await getMenu(date, false, true);
    await Event.emit("new:menu", { data, date });
    return "Ran schedule job.";
  }
}
