import { DataGrid } from "@mui/x-data-grid";
import { useState } from 'react'

const autosizeOptionsDefault = {
    expand: true,
    includeHeaders: true,
    includeOutliers: true,
}

function DataGridCustom({
    tableRows = [],
    tableColumns = [],
    checkboxSelection = true,
    hideFooter = false,
    setDataTableChange = () => { },
    disableMultipleRowSelection = false,
    disabledListRow = [],
    columnVisibilityModel = {},
    centerCell = false
}, ref) {
    return (
        <>
            <DataGrid
                getRowClassName={params => params.row.OwnBot && "own-bot"}
                disableRowSelectionOnClick
                disableMultipleRowSelection={disableMultipleRowSelection}
                isRowSelectable={params => disabledListRow.length > 0 ? !disabledListRow.includes(params.row.id) : params}
                onRowSelectionModelChange={data => { setDataTableChange(data) }}
                disableColumnFilter={true}
                disableColumnMenu={true}
                disableColumnSelector={true}
                pageSizeOptions={[5, 10, 20, 50]}
                initialState={{
                    pagination: !hideFooter ? { paginationModel: { pageSize: 10 } } : {},
                    columns: { columnVisibilityModel }
                }}
                sx={{
                    "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: "bold",
                        color: "#fff"
                    },
                    "& .MuiDataGrid-columnHeader": {
                        background: `var(--headerTable)`
                    },
                    "& .MuiDataGrid-cell:focus": {
                        outline: "none",
                    },
                    "& .MuiDataGrid-columnHeader--alignRight ,.MuiDataGrid-columnHeader--alignRight,.MuiDataGrid-columnHeaderTitleContainer,.MuiDataGrid-columnHeaderDraggableContainer": {
                        flexDirection: "row !important"
                    },
                    "& .MuiDataGrid-cell--textRight": {
                        textAlign: "left"
                    },
                    "& .MuiDataGrid-main": {
                        overflow: "auto"
                    },
                    // ".MuiDataGrid-columnHeaderTitleContainer, .MuiDataGrid-cell":
                    // {
                    //     justifyContent: centerCell && "center !important",
                    //     textAlign: centerCell && "center !important",
                    // },
                    "& .MuiDataGrid-cell":
                    {
                        marginLeft: "1px",
                        background: "#fff"
                    },
                    // ".MuiDataGrid-columnHeaderTitleContainer, .MuiDataGrid-cell":
                    // {
                    //     justifyContent:"center !important",
                    //     textAlign:"center !important", 
                    // }
                    // "& .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainer": {
                    //     display: "none"
                    // }
                    // ".MuiDataGrid-columnHeaderCheckbox, .MuiDataGrid-cellCheckbox ": {
                    //     width:"88px !important",
                    //     maxWidth:"88px !important",
                    //     minWidth:"88px !important",
                    // }
                   maxHeight: '65vh', 
                   overflowY: 'auto' 
                }}
                autoHeight
                autosizeOptions={autosizeOptionsDefault}
                rows={tableRows}
                columns={tableColumns}
                checkboxSelection={false}
            />
        </>
    );
}

export default DataGridCustom;