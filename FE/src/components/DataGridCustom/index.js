import { DataGrid } from "@mui/x-data-grid";


const autosizeOptionsDefault = {
    expand: true,
    includeHeaders: true,
    includeOutliers: true,
}

function DataGridCustom({
    tableRows = [],
    tableColumns = [],
    checkboxSelection = true,
    hideFooter = true,
    setDataTableChange,
    disableMultipleRowSelection = false,
    disabledListRow = []
}, ref) {


    return (

        <DataGrid
            disableRowSelectionOnClick
            disableMultipleRowSelection={disableMultipleRowSelection}
            isRowSelectable={params => disabledListRow.length > 0 ? !disabledListRow.includes(params.row.id) : params}
            onRowSelectionModelChange={data => { setDataTableChange(data) }}
            hideFooter={hideFooter}
            sx={{
                ".MuiDataGrid-columnHeaderTitle": {
                    fontWeight: "bold"
                },
                ".MuiDataGrid-cell:focus": {
                    outline: "none"
                },
                ".MuiDataGrid-columnHeader--alignRight ,.MuiDataGrid-columnHeader--alignRight,.MuiDataGrid-columnHeaderTitleContainer,.MuiDataGrid-columnHeaderDraggableContainer": {
                    flexDirection: "row !important"
                },
                ".MuiDataGrid-cell--textRight": {
                    textAlign: "left"
                }
                // "& .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainer": {
                //     display: "none"
                // }
                // ".MuiDataGrid-columnHeaderCheckbox, .MuiDataGrid-cellCheckbox ": {
                //     width:"88px !important",
                //     maxWidth:"88px !important",
                //     minWidth:"88px !important",
                // }
            }}
            autoHeight
            autosizeOptions={autosizeOptionsDefault}
            rows={tableRows}
            columns={tableColumns}
            checkboxSelection={checkboxSelection}
        />
    );
}

export default DataGridCustom;