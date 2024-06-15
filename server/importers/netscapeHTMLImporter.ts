import { stringToBoolean } from "lib/types/stringToBool";

interface Bookmark {
  title: string;
  url: string;
  tags?: string[];
  description?: string;
  addedAt?: Date | undefined;
  modifiedAt?: Date | undefined;
  visitedAt?: Date | undefined;
  toRead?: boolean;
  private?: boolean;
}

export default function netscapeHTMLImporter(
  file: string,
  options: {
    defaults: {
      toRead: boolean;
      private: boolean;
    };
  }
) {
  let lines = file.split("\n");
  let bookmarks: Bookmark[] = [];
  let feeds: Bookmark[] = [];
  let isDDMode = false;
  let workingDescription = "";

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("<")) {
      if (isDDMode) {
        bookmarks[bookmarks.length - 1].description = workingDescription.trim();
        workingDescription = "";
      }
      isDDMode = false;
    }
    if (
      line.startsWith("<DT>") ||
      line.startsWith("<p>") ||
      line.startsWith("<DL>")
    ) {
      line = line
        .replace("<DT>", "")
        .replace("<p>", "") // pinboard
        .replace("<DL>", "")
        .trim();
    }
    if (line.startsWith("<A")) {
      let title = (line.match(/<A.*?>(.*?)</) || [])[1];
      let url = (line.match(/HREF="(.*?)"/) || [])[1];
      if (title == undefined || url == undefined || line.includes('FEEDURL="'))
        continue;

      let tags = line.match(/TAGS="(.*?)"/)?.[1].split(",");
      let addedAt =
        new Date(1000 * Number((line.match(/ADD_DATE="(.*?)"/) || [])[1])) ||
        undefined;
      let modifiedAt =
        new Date(
          1000 * Number((line.match(/LAST_MODIFIED="(.*?)"/) || [])[1])
        ) || undefined;
      let visitedAt =
        new Date(1000 * Number((line.match(/LAST_VISIT="(.*?)"/) || [])[1])) ||
        undefined;
      let toRead = stringToBoolean(
        (line.match(/TOREAD="([01]|true|false)"/) || [])[1]
      );
      let tempPrivate = stringToBoolean(
        (line.match(/PRIVATE="([01]|true|false)"/) || [])[1]
      );
      let feedUrl = (line.match(/FEEDURL="(.*?)"/) || [])[1] || undefined;
      let constructed = {
        title,
        url,
        tags,
        addedAt:
          addedAt instanceof Date && !isNaN(addedAt.getTime())
            ? addedAt
            : undefined,
        modifiedAt:
          modifiedAt instanceof Date && !isNaN(modifiedAt.getTime())
            ? modifiedAt
            : undefined,
        visitedAt:
          visitedAt instanceof Date && !isNaN(visitedAt.getTime())
            ? visitedAt
            : undefined,
        toRead: toRead == undefined ? options.defaults.toRead : toRead,
        private:
          tempPrivate == undefined ? options.defaults.private : tempPrivate,
      };
      if (feedUrl) {
        feeds.push({ ...constructed, url: feedUrl });
      } else {
        bookmarks.push(constructed);
      }
    }
    if (line.startsWith("<DD>") || isDDMode) {
      isDDMode = true;
      line = line.replace("<DD>", "").trim();
      workingDescription += line;
    }
  }
  return {
    bookmarks,
    feeds,
  };
}
