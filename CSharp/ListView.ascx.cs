using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.UI.HtmlControls;
using System.Linq.Dynamic;
using System.Linq.Expressions;
using CRG.Web2;
using CRG.Web2.UI;
using CRG.Core.Cache;
using CRG.Core.Utility;
using CRG.Web2.Web;
using CRG.Web2.Web.SiteEngine;
using System.Text.RegularExpressions;
using System.Collections.Specialized;
using CRG.Core.Extensions;
using CRG.Web2.UI.Controls;
using System.Xml.Linq;

public partial class Controls_ListView : System.Web.UI.UserControl
{
	#region Properties

	public IEnumerable<Entry> EntryDataSource { get; set; }
	public string FullQuery { get; set; }
	public bool ShowFeed { get; set; }
	public string RSSTitle { get; set; }

	public enum ListViewMode
	{
		Public,
		Detailed,
		Edit,
		Admin
	}

	public ListViewMode ViewMode
	{
		get { return (ViewState["ViewMode"] == null) ? ListViewMode.Public : (ListViewMode)ViewState["ViewMode"]; }
		set { ViewState["ViewMode"] = value; }
	}

	public bool ShowItemNumber
	{
		get { return (ViewState["ShowItemNumber"] == null) ? true : (bool)ViewState["ShowItemNumber"]; }
		set { ViewState["ShowItemNumber"] = value; }
	}

	public bool EnablePaging
	{
		get { return (ViewState["EnablePaging"] == null) ? true : (bool)ViewState["EnablePaging"]; }
		set { ViewState["EnablePaging"] = value; }
	}

	public bool EnableSort
	{
		get { return (ViewState["EnableSort"] == null) ? false : (bool)ViewState["EnableSort"]; }
		set { ViewState["EnableSort"] = value; }
	}

	public bool EnableAlphaFilter
	{
		get { return (ViewState["EnableAlphaFilter"] == null) ? false : (bool)ViewState["EnableAlphaFilter"]; }
		set { ViewState["EnableAlphaFilter"] = value; }
	}

	public ListFeatureParser ListParser
	{
		get { return (ViewState["ListParser"] == null) ? new DefaultListFeatureParser() : (ListFeatureParser)ViewState["ListParser"]; }
		set { ViewState["ListParser"] = value; }
	}

	public int PageSize
	{
		get { return (ViewState["PageSize"] == null) ? 10 : (int)ViewState["PageSize"]; }
		set { ViewState["PageSize"] = value; }
	}

	Expression<Func<Related, bool>> RelatedCategoriesPredicate { get; set; }

	protected string Sort
	{
		get { return (Request.QueryString["sort"] == null) ? "random" : Request.QueryString["sort"].ToString(); }
	}

	protected string SearchKey
	{
		get { return (Request.QueryString["search"] == null) ? string.Empty : Request.QueryString["search"]; }
	}

	//public string PagerQueryStringField
	//{
	//    get { return (ViewState["PagerQueryStringField"] == null) ? string.Empty : (string)ViewState["PagerQueryStringField"]; }
	//    set { ViewState["PagerQueryStringField"] = value; }
	//}

	/// <summary>
	/// The target attribute of the list item urls.
	/// </summary>
	public string Target
	{
		get { return (ViewState["Target"] == null) ? "" : (string)ViewState["Target"]; }
		set { ViewState["Target"] = value; }
	}

	public event EventHandler PageChanged;

	private string EBlastId
	{
		get { return Request.QueryString["eblastId"] ?? null; }
	}

	private string EBlastOption
	{
		get { return Request.QueryString["eblastOption"] ?? null; }
	}

	private string SorterColumn
	{
		get { return !string.IsNullOrEmpty(Request.QueryString["$orderby"]) ? Request.QueryString["$orderby"].Split('=')[0] : string.Empty; }
	}

	/*
	 * Sorter Direction
	 * 0: Not sorted
	 * 1: Ascending
	 * 2: Descending
	 */
	private int SorterDirection
	{
		get
		{
			if (string.IsNullOrEmpty(Request.QueryString["$orderby"]))
			{
				return 0;
			}
			else
			{
				return Request.QueryString["$orderby"].Contains("desc") ? 2 : 1;
			}
		}
	}

	private long _KindId;
	protected long KindId
	{
		get
		{
			if (_KindId == 0)
			{
				if (Request["filter"] != null)
				{
					Match kindidMatch = Regex.Match(Request["filter"], "(?<=kindid=)[0-9]+"); //regex uses positive look-behind.
					long.TryParse(kindidMatch.Value, out _KindId);
				}
			}
			return _KindId;
		}
	}

	#endregion

	protected void Page_Init(object sender, EventArgs e)
	{
		Entry page = SiteFacade.GetCurrentPage() ?? SiteFacade.GetDefaultPage();
		if (page != null)
		{
			if (page.XElementValue("MenuFilterPredicate") != null)
			{
				RelatedCategoriesPredicate = System.Linq.Dynamic.DynamicExpression.ParseLambda<Related, bool>(page.XElementValue("MenuFilterPredicate"));
			}
		}
	}

	protected void Page_Load(object sender, EventArgs e)
	{
		if (!Visible)
		{
			EnableViewState = false;
			return;
		}
		SetDataPager();

		ActionsPanel.Visible = ViewMode == ListViewMode.Admin;

		CreateAlphaFilter();

		sortpanel.Visible = EnableSort;

		if (!IsPostBack)
		{
			BindData(Sort);
			SortDropDown.SelectedValue = Sort;
		}
	}

	protected void CreateAlphaFilter()
	{
		if (EnableAlphaFilter)
		{
			AlphaFilterPanel.Visible = true;

			string rawUrl = Request.RawUrl;
			string url = Url.RemoveUrlQueryString(rawUrl, "$filter");
			string filterQuery = Request.QueryString["$filter"];

			LiteralControl lc = new LiteralControl();
			HyperLink link = new HyperLink();

			string s = "";
			char? selected = null;
			if (filterQuery != null && Regex.Match(filterQuery, @"title startswith '([a-zA-Z])'", RegexOptions.IgnoreCase).Success)
				selected = Regex.Match(filterQuery, @"title startswith '([a-zA-Z])'", RegexOptions.IgnoreCase).Groups[1].Value[0];


			for (char c = 'A'; c <= 'Z'; c = (char)((int)c + 1))
			{
				lc = new LiteralControl();
				link = new HyperLink();
				s = c.ToString();

				//construct link
				link.Text = s;
				link.NavigateUrl = GetAlphaFilterLink(url, filterQuery, s);
				if (selected != null && c == selected.ToString().ToUpper()[0])
					link.CssClass += " selected";
				lc.Text = "|";
				AlphaFilterPanel.Controls.Add(link);
				if (c != 'Z')
					AlphaFilterPanel.Controls.Add(lc);
			}
			
			//"All" link, remove any startswith filter
			if (selected != null)
			{
				lc = new LiteralControl();
				link = new HyperLink();
				lc.Text = "|";
				link.Text = "ALL";
				link.NavigateUrl = RemoveAlphaFilterLink(url, filterQuery);
				AlphaFilterPanel.Controls.Add(lc);
				AlphaFilterPanel.Controls.Add(link);
			}
		}
	}

	protected string GetAlphaFilterLink(string url, string filterQuery, string character)
	{
		NameValueCollection nvc = new NameValueCollection();

		if (string.IsNullOrEmpty(filterQuery))
		{
			nvc.Add("$filter", "title startswith '" + character + "'");
		}
		else
		{
			string pattern = @"title startswith '(.*?)'";
			if (Regex.IsMatch(HttpUtility.UrlDecode(filterQuery), pattern))
			{
				filterQuery = Regex.Replace(HttpUtility.UrlDecode(filterQuery), pattern, "title startswith '" + character + "'");
			}
			else
			{
				filterQuery += " and title startswith '" + character + "'";
			}
			nvc.Add("$filter", filterQuery);
		}
		return Url.AddUrlParams(url, nvc);
	}

	protected string RemoveAlphaFilterLink(string url, string filterQuery)
	{
		NameValueCollection nvc = new NameValueCollection();
		if (!string.IsNullOrEmpty(filterQuery))
		{
			string pattern = @"(and\s)*title startswith '(.*?)'";
			if (Regex.IsMatch(filterQuery, pattern))
			{
				filterQuery = Regex.Replace(filterQuery, pattern, "");
			}
			nvc.Add("$filter", filterQuery);
		}
		return Url.AddUrlParams(url, nvc);
	}

	protected void SetDataPager()
	{
		if (EnablePaging && EntryDataSource != null && EntryDataSource.Count() > 0)
		{
			DataPager1.PageSize = PageSize;
			//DataPager2.PageSize = PageSize;
		}
		else //Disable listview paging
		{
			int pageSize = (DataPager1.TotalRowCount > 0) ? DataPager1.TotalRowCount : 1000;
			DataPager1.PageSize = pageSize; //TODO:  Pager is hacked, can't seem to figure out how to
			//DataPager2.PageSize = pageSize; //Fully disable data paging

			foreach (DataPagerField field in DataPager1.Fields)
			{
				field.Visible = false;
			}
			TopPagerPanel.Attributes.CssStyle.Add("display", "none");
			PagerCountLabel.Visible = false;
			BottomPagerPanel.Visible = false;
		}
	}

	public void BindData()
	{
		BindData(null);
	}

	protected void BindData(string sort)
	{
		object datasource;

		if (EntryDataSource != null)
		{
			if (sort != null && sort.ToLower() == "alpha")
			{
				datasource = EntryDataSource.OrderBy(e => e.Title).ToList();
			}
			else if (sort != null && sort.ToLower() == "alphad")
			{
				datasource = EntryDataSource.OrderByDescending(e => e.Title).ToList();
			}
			else// (sort.ToLower() == "random")
			{
				datasource = EntryDataSource.ToList();
			}

			LV.DataSource = datasource;
			LV.DataBind();
		}
	}

	protected void Apply_Click(object sender, EventArgs e)
	{
		int value;
		if (int.TryParse(BulkActions.SelectedValue, out value))
		{
			using (Web2DataContext dc = new Web2DataContext())
			{
				foreach (ListViewDataItem item in LV.Items)
				{
					if (item.ItemType == ListViewItemType.DataItem)
					{
						long entryId = (long)LV.DataKeys[item.DataItemIndex % PageSize].Value;
						CheckBox checkbox = item.FindControl("BulkCheckBox") as CheckBox;
						if (value <= 3 && checkbox.Checked)
						{
							Entry entry = dc.Entries.SingleOrDefault(a => a.EntryId == entryId);
							long newEntryId = CRG.Web2.Publishing.PublishingManager.ChangeStatus(entry, (PublishedStatus)value, dc);

							if ((PublishedStatus)value == PublishedStatus.Published)    //Send Approved Email notifications
							{

								//PublishingManager.SendApprovedEmails(string.Format("http://{0}/Profile.aspx?entryid={1}", Request.Url.Authority, approvedId), approvedId);
							}
						}
					}
				}
			}
		}
		Response.Redirect(Request.RawUrl);
	}
	protected void SortDropDown_SelectedIndexChanged(object sender, EventArgs e)
	{
		if (Sort != SortDropDown.SelectedValue)
		{
			string url = CRG.Core.Utility.Url.AddUrlParams(Request.RawUrl, "sort=" + SortDropDown.SelectedValue);
			Response.Redirect(url);
		}
	}

	protected void ListView1_ItemDataBound(object sender, ListViewItemEventArgs e)
	{
		if (e.Item.ItemType == ListViewItemType.DataItem)
		{
			Entry entry = ((CRG.Web2.Entry)((ListViewDataItem)e.Item).DataItem);

			ListFeature feature = new ListFeature();

			if (ViewMode == ListViewMode.Admin)
			{
				feature = ListParser.Parse(entry, ImageSize.XSmall);
			}
			else
			{
				feature = ListParser.Parse(entry);
			}
			//ListParser.Parse(entry);

			Label itemNumber = e.Item.FindControl("N") as Label;
			if (!ShowItemNumber)
				itemNumber.Visible = false;

			//Image
			if (entry.DefaultImage != null)
			{
				System.Web.UI.WebControls.Image image = e.Item.FindControl("I") as System.Web.UI.WebControls.Image;
				image.Visible = true;
				image.ImageUrl = entry.DefaultImageThumbnailUrl_50;
			}
			else
			{
				e.Item.FindControl("IX").Visible = true;
			}
			//Title Link
			HyperLink titleLink = e.Item.FindControl("T") as HyperLink;
			titleLink.Text = feature.Title;
			if (ViewMode == ListViewMode.Admin)
			{
				titleLink.NavigateUrl = entry.OverviewUrl;
			}
			else
			{
				titleLink.NavigateUrl = entry.OverviewUrl;
			}
			titleLink.Target = Target;

			//Description Text
			int shortDescriptionLength = 200;
			Label descriptionShort = e.Item.FindControl("DS") as Label;
			Label descriptionLong = e.Item.FindControl("DL") as Label;

			if (!string.IsNullOrEmpty(feature.Description))
			{
				if (feature.Description.StripHTML().Length > shortDescriptionLength)
				{
					descriptionShort.Visible = descriptionLong.Visible = true;
					descriptionShort.Attributes["entryid"] = descriptionLong.Attributes["entryid"] = entry.EntryId.ToString();
					descriptionShort.Text = feature.Description.StripHTML().SubstringFullWords(shortDescriptionLength - 50)
						 + " <a href=\"#\" class='readmore'>read&nbsp;more</a>";
					descriptionLong.Text = feature.Description.StripHTML() 
						+ " <a href=\"#\" class='readmore'>read&nbsp;less</a>";
				}
				else
				{
					descriptionShort.Visible = true;
					descriptionShort.Text = feature.Description.StripHTML();
				}
			}
			
			////Read More Link
			//HyperLink readMoreLink = e.Item.FindControl("ML") as HyperLink;
			//if (string.IsNullOrEmpty(feature.Description))
			//{
			//    readMoreLink.Visible = false;
			//}
			//else
			//{
			//    readMoreLink.Visible = true;
			//    readMoreLink.NavigateUrl = titleLink.NavigateUrl;
			//}

			//Address
			Panel AddressPanel = e.Item.FindControl("AP") as Panel;
			AddressPanel.Visible = (ViewMode != ListViewMode.Public);
			if (AddressPanel.Visible)
			{

				Label AddressLabel = e.Item.FindControl("AL") as Label;
				Label Address = e.Item.FindControl("A") as Label;
				if (feature.Addresses != null)
				{
					Address address = feature.Addresses.Where(a => a.Kind.ToLower().Equals("address")).FirstOrDefault();
					if (address != null)
						Address.Text += "<br />" + address.Text;
				}

				AddressLabel.Visible = !string.IsNullOrEmpty(Address.Text.Trim());
			}

			//Values Panel
			Panel RelatedValuesPanel = e.Item.FindControl("RVP") as Panel;
			RelatedValuesPanel.Visible = entry.RelatedValues != null;
			if (RelatedValuesPanel.Visible)
			{
				Label allvalues = e.Item.FindControl("allvalues") as Label;
				allvalues.Text = string.Format("{0} {1} {2} {3} {4} {5}",
										entry.RelatedValues.TextValue == null ? null : HttpUtility.HtmlEncode(entry.RelatedValues.TextValue),
										entry.RelatedValues.DoubleValue,
										entry.RelatedValues.DateValue == null ? null : ((DateTime)entry.RelatedValues.DateValue).ToShortDateString(),
										entry.RelatedValues.BoolValue == null ? null : (bool)entry.RelatedValues.BoolValue ? "Yes" : "No",
										entry.RelatedValues.IntValue,
										entry.RelatedValues.XmlValue == null ? null : HttpUtility.HtmlEncode(entry.RelatedValues.XmlValue));
			}

			//Edit Panel
			HtmlGenericControl EditCell = e.Item.FindControl("EC") as HtmlGenericControl;
			EditCell.Visible = (ViewMode == ListViewMode.Edit) || ViewMode == ListViewMode.Admin;
			if (EditCell.Visible)
			{
				HyperLink EditLink = e.Item.FindControl("EL") as HyperLink;
				if (BaseSecurity.CanEdit(entry.EntryId))
				{
					EditLink.NavigateUrl = ResolveUrl(string.Format("~/admin/profiles/{0}?Edit=true", entry.EntryId));
				}
				else
				{
					EditLink.Enabled = false;
				}				
					
				HyperLink ViewLink = e.Item.FindControl("VL") as HyperLink;
				if (BaseSecurity.CanView(entry.EntryId))
				{
					ViewLink.NavigateUrl = ResolveUrl(string.Format("~/admin/profiles/{0}", entry.EntryId));
				}
				else
				{
					ViewLink.Enabled = false;
				}
			}

			Panel PublishedStatusPanel = e.Item.FindControl("PSP") as Panel;
			PublishedStatusPanel.Visible = (ViewMode == ListViewMode.Edit);

			PlaceHolder AdminCell = e.Item.FindControl("AC") as PlaceHolder;
			AdminCell.Visible = (ViewMode == ListViewMode.Admin);

			Label DataType = e.Item.FindControl("DT") as Label;
			DataType.Text = SiteConfiguration.Current.Kinds.FirstOrDefault(k => k.EntryId == entry.KindId).Title;

			HtmlTableCell CB = e.Item.FindControl("CB") as HtmlTableCell;
			CB.Visible = (ViewMode == ListViewMode.Admin);

		}
	}

	protected void ListView1_ItemCommand(object sender, ListViewCommandEventArgs e)
	{
		if (e.CommandName.Equals("DeleteEntry"))
		{
			long entryId = Convert.ToInt64(e.CommandArgument);

			using (Web2DataContext dc = new Web2DataContext())
			{
				if (BaseSecurity.CanEdit(entryId))
				{
					//PublishingManager.ChangeStatus(entryId, PublishedStatus.Disabled, dc);
					dc.Entry_Delete(entryId);
				}
			}
		}
		Response.Redirect(Request.Url.PathAndQuery);
	}

	protected void ListView1_LayoutCreated(object sender, EventArgs e)
	{
		PlaceHolder AdminThCell = this.LV.FindControl("ACTH") as PlaceHolder;
		AdminThCell.Visible = (ViewMode == ListViewMode.Admin);

		HtmlGenericControl LVI = this.LV.FindControl("LVI") as HtmlGenericControl;
		if (ViewMode == ListViewMode.Admin)
		{
			LVI.Attributes.Add("class", "dashList");
		}

		CreateHeaderSorter(LVI);
	}

	protected void CreateHeaderSorter(HtmlGenericControl control)
	{
		string rawUrl = Request.RawUrl;
		string url = Url.RemoveUrlQueryString(rawUrl, "$orderby");
		string sorterQuery = Request.QueryString["$orderby"];

		PlaceHolder AdminThCell = control.FindControl("ACTH") as PlaceHolder;
		HyperLink HeaderTitle = AdminThCell.FindControl("HeaderTitle") as HyperLink;
		HeaderTitle.NavigateUrl = GetSorterLink(url, sorterQuery, "title");

		//HyperLink HeaderStatus = AdminThCell.FindControl("HeaderStatus") as HyperLink;
		//HeaderStatus.NavigateUrl = GetSorterLink(url, sorterQuery, "publishedstatus");

		HyperLink HeaderDataType = AdminThCell.FindControl("HeaderDataType") as HyperLink;
		HeaderDataType.NavigateUrl = GetSorterLink(url, sorterQuery, "kindid");

		HyperLink HeaderUpdated = AdminThCell.FindControl("HeaderUpdated") as HyperLink;
		HeaderUpdated.NavigateUrl = GetSorterLink(url, sorterQuery, "dateupdated");
	}

	protected string GetSorterLink(string url, string sorterQuery, string column)
	{
		NameValueCollection nvc = new NameValueCollection();
		nvc.Add("$orderby", column + ((column.Equals(SorterColumn) && SorterDirection == 1) ? " desc" : string.Empty));
		return Url.AddUrlParams(url, nvc);
	}

	protected void LV_PagePropertiesChanging(object sender, PagePropertiesChangingEventArgs e)
	{
		//LVStartRowIndex.Value = e.StartRowIndex.ToString();
		this.DataPager1.SetPageProperties(e.StartRowIndex, e.MaximumRows, false);
		BindData(Sort);
		if (PageChanged != null)
		{
			PageChanged(this, e);
		}
		//OnPageChanged(e);
	}

	//protected void OnPageChanged(PagePropertiesChangingEventArgs e)
	//{
	//    if (PageChanged != null)
	//    {
	//        PageChanged(this, e);
	//    }
	//}

	protected void DataPager_PreRender(object sender, EventArgs e)
	{
		if (EntryDataSource != null)
		{
			int pageSize = DataPager1.PageSize;
			int totalSize = DataPager1.TotalRowCount;
			int startIndex = DataPager1.StartRowIndex + 1;
			int endIndex = startIndex + pageSize - 1 < totalSize ? startIndex + pageSize - 1 : totalSize;
			pageSize = (pageSize > totalSize) ? totalSize : pageSize;

			if (pageSize == 0)
				PagerCountLabel.Text = "No results found.";
			else
				PagerCountLabel.Text = string.Format("Results {0} - {1} of {2}", startIndex, endIndex, totalSize);
		}
	}

	//protected void PagerCommand(object sender, DataPagerCommandEventArgs e)
	//{
	//    switch (e.CommandName)
	//    {
	//        case "Next":
	//            //  guard against going off the end of the list
	//            e.NewStartRowIndex = Math.Min(e.Item.Pager.StartRowIndex + e.Item.Pager.MaximumRows, e.Item.Pager.TotalRowCount - e.Item.Pager.MaximumRows);
	//            e.NewMaximumRows = e.Item.Pager.MaximumRows;
	//            break;
	//        case "Previous":
	//            //  guard against going off the begining of the list
	//            e.NewStartRowIndex = Math.Max(0, e.Item.Pager.StartRowIndex - e.Item.Pager.MaximumRows);
	//            e.NewMaximumRows = e.Item.Pager.MaximumRows;
	//            break;
	//        case "Last":
	//            //  the
	//            e.NewStartRowIndex = e.Item.Pager.TotalRowCount - e.Item.Pager.MaximumRows;
	//            e.NewMaximumRows = e.Item.Pager.MaximumRows;
	//            break;
	//        case "First":
	//        default:
	//            e.NewStartRowIndex = 0;
	//            e.NewMaximumRows = e.Item.Pager.MaximumRows;
	//            break;
	//    }
	//}
	//protected void LV_Sorting(object sender, ListViewSortEventArgs e)
	//{

	//}
	//protected void Sort_Command(object sender, CommandEventArgs e)
	//{
	//    LV.Sort(e.CommandArgument.ToString(), LV.SortDirection);
	//}
}
