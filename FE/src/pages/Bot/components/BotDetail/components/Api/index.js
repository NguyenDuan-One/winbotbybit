import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import styles from "./Api.module.scss"
import { useEffect, useState } from "react";
import AddApi from "./components/AddApi";
import EditApi from "./components/EditApi";
import { getBotApiByBotID } from "../../../../../../services/botApiService";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { useParams } from "react-router-dom";
import DataGridCustom from "../../../../../../components/DataGridCustom";

function Api() {

    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'ApiKey',
            headerName: 'ApiKey',
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell:()=>{
                return "ByBit"
            }
        },
        {
            field: 'SecretKey',
            headerName: 'SecretKey',
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell:()=>{
                return "***** ***** *****"
            }
        },
    ]
    const [openAddApi, setOpenAddApi] = useState({
        isOpen: false,
        dataChange: ""
    });
    const [openEditApi, setOpenEditApi] = useState({
        isOpen: false,
        dataChange: ""
    });
    const [apiData, setApiData] = useState([]);

    const dispatch = useDispatch()

    const { botID } = useParams()


    const handleGetApiData = async () => {
        try {
            const res = await getBotApiByBotID(botID)
            const { status, message, data: resData } = res.data
            if (status === 200) {
                setApiData(resData.map(item => ({ ...item, id: item._id })))
            }
            else {
                dispatch(addMessageToast({
                    status: status,
                    message: message,
                }))
            }
        } catch (error) {
            // dispatch(addMessageToast({
            //     status: 500,
            //     message: "Get Api Error",
            // }))
        }
    }
    useEffect(() => {
        handleGetApiData()
    }, []);

    useEffect(() => {
        if (openAddApi.dataChange || openEditApi.dataChange) {
            handleGetApiData()
        }
    }, [openAddApi, openEditApi]);
    return (
        <div className={styles.api}>
            <div className={styles.apiHeader}>
                {
                    apiData.length > 0
                        ?
                        <Button
                            size="small"
                            variant="contained"
                            color="info"
                            onClick={() => {
                                setOpenEditApi({
                                    isOpen: true,
                                    dataChange: ""
                                })
                            }}
                        >
                            update Api
                        </Button>
                        :
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setOpenAddApi({
                                    isOpen: true,
                                    dataChange: ""
                                })
                            }}
                        >
                            Api
                        </Button>
                }
            </div>
            <DataGridCustom
                tableRows={apiData}
                tableColumns={tableColumns}
                checkboxSelection={false}
            />

            {openAddApi.isOpen && <AddApi
                open={openAddApi}
                onClose={(data) => {
                    setOpenAddApi(data)
                }}
            />}

            {openEditApi.isOpen && <EditApi
                open={openEditApi}
                botApiData={apiData[0]}
                onClose={(data) => {
                    setOpenEditApi(data)
                }}
            />}

        </div>
    );
}

export default Api;