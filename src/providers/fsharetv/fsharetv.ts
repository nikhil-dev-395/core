import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    SourceType,
    Subtitle,
    SubtitleFormat
} from '@omss/framework';
import axios from 'axios';
import { IFshareTvResponse, IFshareTvSubtitle } from './fsharetv.types.js';

export class FshareProvider extends BaseProvider {
    readonly id = 'fsharetv';
    readonly name = 'FshareTV';
    readonly enabled = true;
    readonly BASE_URL = 'https://fsharetv.co';
    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Referer: `${this.BASE_URL}/`
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies']
    };

    /**
     * Fetch movie sources
     */
    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            let sourceId = await this.extractDocument(media);

            if (!sourceId) {
                throw new Error('Source ID not found');
            }
            // let movieSource =  await ;
            // let subtitleSource = await
            const [movieSource, subtitleSource] = await Promise.all([
                this.fetchSource(sourceId),
                this.fetchSubtitle(media.imdbId ?? '')
            ]);

            //console.log(movieSource);
            return {
                sources: movieSource.sources,
                subtitles: subtitleSource.subtitles,
                diagnostics: []
            };
        } catch (error) {
            return this.emptyResult(
                error instanceof Error
                    ? error.message
                    : 'error at getting source',
                media
            );
        }
    }

    /**
     * Fetch TV episode sources
     */
    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        try {
            return {
                sources: [],
                subtitles: [],
                diagnostics: []
            };
        } catch (error) {
            return this.emptyResult(
                error instanceof Error
                    ? error.message
                    : 'error at getting source',
                media
            );
        }
    }

    private buildDocumentUrl(
        type: 'movie' | 'tv' = 'movie',
        title: string,
        imdbId: string
    ): string {
        // this only supports movie
        const movieId = `${title}-episode-1-${imdbId}`;
        return `${this.BASE_URL}/w/${movieId}`;
    }

    private async extractDocument(media: ProviderMediaObject) {
        try {
            return await axios
                .get(
                    this.buildDocumentUrl(
                        'movie',
                        media.title ?? '',
                        media.imdbId ?? ''
                    ),
                    { headers: this.HEADERS }
                )
                .then((res) => {
                    // console.log(res);
                    const SOURCE_ID_REGEX =
                        /(?<=\b(?:Movie\.setSource|Subtitle\.init)\(')[^']+(?='\))/g;
                    const SOURCE_ID = res.data.match(SOURCE_ID_REGEX);
                    //console.log(SOURCE_ID[0]);
                    // https://fsharetv.cc/api/file/{SOURCE_ID}/source?trailer=Png81APqcxU&type=watch
                    return SOURCE_ID?.[0] ?? null;
                })
                .catch((e) => {
                    console.log(e);
                });
        } catch (error) {
            this.console.error(error instanceof Error ? error.message : '');
            return;
        }
    }

    private async fetchSource(
        sourceId: string
    ): Promise<{ sources: Source[] }> {
        // https://fsharetv.cc/api/file/d3bec884e45d3c7a936df09b7dae6861INLkeO1LF0920q07Nr+Qrw==/source?trailer=Png81APqcxU&type=watch

        const JSON_URL = `https://fsharetv.cc/api/file/${sourceId}/source`;

        const requestUrl = await axios.get<IFshareTvResponse>(JSON_URL, {
            headers: this.HEADERS
        });

        let source =
            requestUrl?.data.data.file.sources?.map((val) => ({
                url: this.createProxyUrl(`https://fsharetv.cc${val.src}`),
                type: (val.type ?? 'video/mp4') as SourceType,
                quality: String(val.quality),
                provider: { name: this.name, id: this.id },
                audioTracks: [{ language: 'eng', label: 'English' }]
            })) ?? [];

        let alternatives =
            requestUrl.data.data.file.alternatives?.flat()?.map((val) => ({
                url: this.createProxyUrl(`https://fsharetv.cc${val.src}`),
                type: (val.type ?? 'video/mp4') as SourceType,
                quality: String(val.quality),
                provider: { name: this.name, id: this.id },
                audioTracks: [{ language: 'eng', label: 'English' }]
            })) ?? [];
        return {
            sources: [...source, ...alternatives]
        };
    }

    private async fetchSubtitle(
        imdbId: string
    ): Promise<{ subtitles: Subtitle[] }> {
        try {
            const url = `https://subpanda.com/api/movie/${imdbId}/subtitles?lang=en&source=open_subtitles
      `;
            const { data } = await axios.get<IFshareTvSubtitle>(url, {
                headers: this.HEADERS
            });
            const subtitles: Subtitle[] =
                data.data.subtitles?.map((val) => ({
                    url: this.createProxyUrl(val?.download_link) || '',
                    label: val.language_name || 'English',
                    format: (val.format || 'vtt') as SubtitleFormat
                })) ?? [];
            return { subtitles };
        } catch (error) {
            this.console.error(error instanceof Error ? error.message : '');
            return { subtitles: [] };
        }
    }

    private emptyResult(
        message: string,
        media: ProviderMediaObject
    ): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [
                {
                    code: 'PROVIDER_ERROR',
                    message: `${this.name}: ${message}`,
                    field: '',
                    severity: 'error'
                }
            ]
        };
    }
    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.head(this.BASE_URL, {
                headers: this.HEADERS
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
