import axios from 'axios';
import { WikiEditEvent } from '../../interfaces/WikiEvent';

export default async function wikiCompare(
  editEvent: WikiEditEvent,
): Promise<string> {
  const { revision, server_url, title } = editEvent;

  const { data: response } = await axios.get(`${server_url}/w/api.php`, {
    params: {
      action: 'compare',
      format: 'json',
      utf8: 1,
      fromtitle: title,
      fromrev: revision.old,
      totitle: title,
      torev: revision.new,
    },
  });

  if (response.error) {
    throw new Error(response.error.info);
  }

  const diff = response.compare['*'];
  return diff;
}
