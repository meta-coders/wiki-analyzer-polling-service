import axios from 'axios';
import WikiEvent from '../../interfaces/WikiEvent';

export default async function wikiPageExistence(
  event: WikiEvent,
): Promise<boolean> {
  const { server_url, title } = event;
  const { data: response } = await axios.get(`${server_url}/w/api.php`, {
    params: {
      action: 'query',
      format: 'json',
      formatversion: 2,
      titles: title,
    },
  });

  const [page] = response.query.pages;

  return !page.missing;
}
