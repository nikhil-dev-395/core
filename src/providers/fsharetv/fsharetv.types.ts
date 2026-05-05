export interface IFshareTvResponse {
    data: {
        file: {
            sources?: Source[];
            backups?: any[];
            alternatives?: Source[][];
            downloads?: Download[];
        };
    };
}

type Provider = {
    name: string;
    id: string;
};

type audioTracks = { language: string; label: string };

type Source = {
    url: string;
    src?: string;
    label?: string;
    type?: string;
    quality?: number | string;
    provider?: Provider;
    audioTracks?: audioTracks[];
};

type Download = {
    src?: string;
    label?: string;
};

export interface IFshareTvSubtitle {
    data: {
        subtitles?: [
            {
                id?: string;
                download_link: string;
                source?: string;
                language_name?: string;
                format?: string;
            }
        ];
    };
}
