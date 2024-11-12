export interface IRepo {
  slug: string;
  description: string;
  is_private: boolean;
  has_issues: boolean;
  has_wiki: boolean;
}

export interface IBitbucketRepos {
  values: IRepo[];
  next: boolean;
}
