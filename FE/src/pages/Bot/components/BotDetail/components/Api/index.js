import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import styles from "./Api.module.scss"
import { useEffect, useRef, useState } from "react";
import AddApi from "./components/AddApi";
import EditApi from "./components/EditApi";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../../../../../store/slices/Toast";
import { useParams } from "react-router-dom";
import DataGridCustom from "../../../../../../components/DataGridCustom";
import { getBotByID } from "../../../../../../services/botService";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

function Api() {

    const tableColumns = [
        {
            field: 'stt',
            headerName: 'STT',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'ApiKey',
            headerName: 'ApiKey',
            minWidth: 150,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: () => {
                return "ByBit"
            }
        },
        {
            field: 'SecretKey',
            headerName: 'SecretKey',
            minWidth: 200,
            flex: window.innerWidth <= 740 ? undefined : 1,
            renderCell: () => {
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
        confirm: false,
        dataChange: ""
    });
    const [apiData, setApiData] = useState([]);
    const [botType, setBotType] = useState("");
    const checkBotRef = useRef(false)

    const dispatch = useDispatch()

    const { botID } = useParams()


    const handleGetApiData = async () => {
        try {
            const res = await getBotByID(botID)
            const { status, message, data: resData } = res.data
            if (status === 200) {
                resData.ApiKey ? setApiData([resData].map(item => ({ ...item, id: item._id }))) : setApiData([])
                setBotType(resData.botType)
                checkBotRef.current= resData.Status === "Running"
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
                        <button
                           className="px-3 py-2 rounded-lg text-white bg-blue-600"
                            onClick={() => {
                                setOpenEditApi({
                                    ...openEditApi,
                                    isOpen: checkBotRef.current,
                                    confirm:!checkBotRef.current
                                })
                            }}
                        >
                            Cập nhật
                        </button>
                        :
                        <button
                            className="px-3 py-2 rounded-lg text-white bg-blue-600"
                            onClick={() => {
                                setOpenAddApi({
                                    isOpen: true,
                                    dataChange: ""
                                })
                            }}
                        >
                            Thêm mới
                        </button>
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
                checkBot = {checkBotRef.current}
                botType = {botType}
            />}

            {openEditApi.confirm && <EditApi
                open={openEditApi}
                botData={apiData[0]}
                onClose={(data) => {
                    setOpenEditApi(data)
                }}
                botType = {botType}
            />}

            {
                openEditApi.isOpen && (
                    <BottomSheetModal
                        backdrop
                        open={true}
                        onClose={() => {
                            setOpenEditApi({
                                confirm: false,
                                isOpen: false,
                                dataChange: "",
                            })
                        }}
                        onSubmit={() => {
                            setOpenEditApi({
                                dataChange: "",
                                isOpen:false,
                                confirm: true,
                            })
                        }}
                        dialogTitle="Cảnh báo"
                        submitBtnColor="warning"
                        submitBtnText="update"
                        reserveBtn
                        position="center"
                    >
                        <p style={{ textAlign: "center" }}>Bot is running - Do you want to update?</p>
                    </BottomSheetModal >
                )
            }

        </div>
    );
}

export default Api;